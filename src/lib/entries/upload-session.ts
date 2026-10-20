import { TransferCancelled, type Transfer } from "./media-transfer";
import { UploadOperationError } from "./upload-errors";
import type { QueuedPhoto } from "./upload-queue";
import type { UploadAllocation } from "./upload-batch";
import type { UploadBatch, UploadJob, UploadStore } from "./upload-store";

export type UploadSnapshot = { items: UploadJob[]; paused: boolean; waiting: boolean; completed: number; total: number; error: string; ready: boolean };
export type UploadOperations = {
  prepare: (job: UploadJob) => Promise<UploadAllocation>;
  transfer: (job: UploadJob, allocation: UploadAllocation, progress: (percent: number) => void, checkpoint: (url: string) => Promise<void>) => Promise<Transfer>;
  finalize: (job: UploadJob, allocation: UploadAllocation) => Promise<void>;
  remove: (job: UploadJob) => Promise<void>;
  saved: () => Promise<void>;
};

/** One writer holds the entry's Web Lock. Every durable phase precedes the next network action. */
export class UploadSession {
  private jobs: UploadJob[] = [];
  private batch: UploadBatch = { paused: false, completed: 0, total: 0 };
  private running = false;
  private stopped = false;
  private ready = false;
  private error = "";
  private active: { key: string; transfer?: Transfer; done: Promise<void>; finish: () => void } | null = null;
  private removing = new Set<string>();
  private adding: Promise<void> = Promise.resolve();
  constructor(private store: UploadStore, private operations: UploadOperations, private changed: (snapshot: UploadSnapshot) => void, private online = () => navigator.onLine) {}

  private emit() {
    if (this.stopped) return;
    this.changed({ items: [...this.jobs], paused: this.batch.paused, waiting: this.jobs.some(job => job.status === "waiting") && !this.jobs.some(job => job.status === "sending" || job.status === "processing" || job.status === "queued"),
      completed: this.batch.completed, total: this.batch.total, error: this.error, ready: this.ready });
  }
  async initialize(initial: QueuedPhoto[]) {
    try {
      const restored = await this.store.load();
      if (this.stopped) return;
      this.jobs = restored.jobs.sort((a, b) => a.queuedAt - b.queuedAt);
      this.batch = restored.batch;
      this.error = restored.warning ?? "";
      this.ready = true;
      this.emit();
      if (initial.length) await this.add(initial.filter(item => !this.jobs.some(job => job.key === item.key)));
      void this.pump();
    } catch (error) { this.report(error); }
  }
  private report(error: unknown) {
    this.error = error instanceof Error ? error.message : "Could not recover uploads. Reload and try again.";
    this.emit();
  }
  add(photos: QueuedPhoto[]) {
    const task = this.adding.then(() => this.append(photos));
    this.adding = task.catch(() => {});
    return task;
  }
  private async append(photos: QueuedPhoto[]) {
    if (!this.ready || this.stopped) throw Error("Your saved uploads are still opening. Try again in a moment.");
    if (!photos.length) return;
    if (photos.length + this.jobs.length > 30) throw Error("You can add up to 30 at a time. Let these finish, then add the rest.");
    const at = Date.now();
    const jobs: UploadJob[] = photos.map((photo, index) => ({ ...photo, status: "queued", progress: 0, error: "", attempts: 0, retryAt: 0, queuedAt: at + index / 1000 }));
    const batch = this.jobs.length ? { ...this.batch, total: this.batch.total + jobs.length } : { paused: false, completed: 0, total: jobs.length };
    await this.store.add(jobs, batch);
    if (this.stopped) return;
    batch.paused = this.batch.paused;
    this.jobs.push(...jobs); this.batch = batch; this.error = ""; this.emit();
    void this.pump();
  }
  private wanted(job: UploadJob) { if (this.stopped || this.removing.has(job.key) || !this.jobs.includes(job)) throw new TransferCancelled("Stopped."); }
  private async checkpoint(job: UploadJob) { this.wanted(job); await this.store.save(job); this.wanted(job); }

  async pump() {
    if (!this.ready || this.running || this.stopped || this.batch.paused) return;
    this.running = true;
    try {
      while (!this.stopped && !this.batch.paused) {
        await this.adding;
        if (this.stopped || this.batch.paused) break;
        const job = this.jobs.find(job => job.status !== "failed" && !this.removing.has(job.key) && job.retryAt <= Date.now());
        if (!job) break;
        if (!this.online()) {
          for (const pending of this.jobs) if (pending.status !== "failed") pending.status = "waiting";
          this.emit(); break;
        }
        let finished!: () => void;
        const done = new Promise<void>(resolve => { finished = resolve; });
        this.active = { key: job.key, done, finish: finished };
        try {
          job.status = "sending"; job.error = ""; job.retryAt = 0; this.emit();
          // Stable client UUID makes a lost prepare response safe to retry. The
          // server rechecks ownership and reconciles an already stored original.
          if (!job.allocation?.uploaded) {
            const previous = job.allocation;
            job.allocation = await this.operations.prepare(job);
            if (previous?.id === job.allocation.id) job.allocation.uploadUrl = previous.uploadUrl;
            job.stored = job.allocation.id;
            await this.checkpoint(job);
          }
          const allocation = job.allocation;
          this.wanted(job);
          if (!allocation.uploaded) {
            if (this.batch.paused) { job.status = "queued"; break; }
            const transfer = await this.operations.transfer(job, allocation, percent => {
              if (this.stopped) return;
              job.progress = percent; this.emit();
            }, async url => { allocation.uploadUrl = url; await this.checkpoint(job); });
            this.active!.transfer = transfer;
            if (this.stopped) transfer.suspend();
            else if (this.removing.has(job.key)) await transfer.cancel();
            else if (this.batch.paused) await transfer.pause();
            await transfer.done;
            allocation.uploaded = true;
            await this.checkpoint(job);
          }
          this.wanted(job);
          job.status = "processing"; job.progress = 100; this.emit();
          await this.operations.finalize(job, allocation);
          await this.adding;
          this.wanted(job);
          const batch = { ...this.batch, completed: this.batch.completed + 1 };
          await this.store.remove(job.key, batch);
          this.jobs = this.jobs.filter(item => item !== job); this.batch = batch; this.emit();
          // A gallery refresh is not a failed upload; a later poll repairs it.
          await this.operations.saved().catch(() => {});
        } catch (error) {
          if (this.stopped) break;
          if (error instanceof TransferCancelled || !this.jobs.includes(job)) continue;
          job.attempts++;
          const recoverable = error instanceof UploadOperationError && error.recoverable;
          if (error instanceof UploadOperationError && error.resetUpload && job.allocation) job.allocation.uploadUrl = undefined;
          job.status = recoverable ? "waiting" : "failed";
          job.retryAt = recoverable ? Date.now() + Math.max(error.retryAfter, Math.min(300000, 15000 * 2 ** Math.min(job.attempts - 1, 5))) : 0;
          job.error = error instanceof Error ? error.message : "This file couldn't be added. Try again.";
          try { await this.store.save(job); } catch (storage) { this.report(storage); this.batch.paused = true; }
          this.emit();
        } finally { this.active?.finish(); this.active = null; }
      }
    } finally { this.running = false; this.emit(); }
  }

  async pause() {
    this.batch.paused = true; this.emit();
    await this.active?.transfer?.pause();
    await this.store.batch(this.batch);
  }
  async resume() {
    this.batch.paused = false;
    await this.store.batch(this.batch);
    const allocation = this.jobs.find(job => job.key === this.active?.key)?.allocation;
    if (allocation?.expiresAt && Date.parse(allocation.expiresAt) <= Date.now() && !allocation.uploaded) this.active?.transfer?.suspend();
    else this.active?.transfer?.resume();
    this.emit(); void this.pump();
  }
  async retry(key?: string) {
    for (const job of this.jobs) if ((!key || job.key === key) && (job.status === "failed" || job.status === "waiting")) {
      job.status = "queued"; job.retryAt = 0; job.attempts = 0; job.error = "";
      await this.store.save(job);
    }
    this.emit(); void this.pump();
  }
  /** Connection events expedite deferred work, but never release a manual pause. */
  wake() {
    for (const job of this.jobs) if (job.status === "waiting" && job.attempts === 0) job.retryAt = 0;
    void this.pump();
  }
  async remove(key: string) {
    const job = this.jobs.find(job => job.key === key);
    if (!job || job.status === "processing") return;
    // Keep the row/file until server cleanup succeeds, so an interrupted remove
    // is recoverable. Stop the local writer before touching its allocation.
    this.removing.add(key);
    job.status = "failed";
    const active = this.active?.key === key ? this.active : null;
    await active?.transfer?.cancel();
    await active?.done;
    try {
      await this.operations.remove(job);
      const batch = { ...this.batch, total: Math.max(this.batch.completed, this.batch.total - 1) };
      await this.store.remove(key, batch);
      this.jobs = this.jobs.filter(item => item !== job); this.batch = batch;
      if (!this.jobs.length) this.batch.paused = false;
    } catch (error) { job.error = error instanceof Error ? error.message : "Could not remove this file. Try again."; await this.store.save(job); }
    this.removing.delete(key); this.emit(); void this.pump();
  }
  async dispose() { this.stopped = true; this.active?.transfer?.suspend(); await this.active?.done; }
}
