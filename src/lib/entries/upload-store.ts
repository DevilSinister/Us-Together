import type { UploadItem } from "./upload-queue";
import type { UploadAllocation } from "./upload-batch";
import { z } from "zod";
import { mediaTypes, validateUpload } from "@/lib/memories/media";

export type UploadJob = UploadItem & { allocation?: UploadAllocation; attempts: number; retryAt: number; queuedAt: number };
export type UploadBatch = { paused: boolean; completed: number; total: number };
export type UploadStore = {
  load: () => Promise<{ jobs: UploadJob[]; batch: UploadBatch; warning?: string }>;
  add: (jobs: UploadJob[], batch: UploadBatch) => Promise<void>;
  save: (job: UploadJob) => Promise<void>;
  batch: (batch: UploadBatch) => Promise<void>;
  remove: (key: string, batch: UploadBatch) => Promise<void>;
};

const DATABASE = "us-together-uploads";
const TTL = 24 * 60 * 60 * 1000;
const MAX_BYTES = 600 * 1024 * 1024;
const storageError = () => Error("Could not save the upload queue on this device. Free some space and allow site storage, then try again.");
type StoredJob = Omit<UploadJob, "file"> & { id: string; scope: string; owner: string; expires: number; name: string; modified: number; size: number };
type StoredBatch = UploadBatch & { scope: string; owner: string; expires: number };
const batchSchema = z.object({ paused: z.boolean(), completed: z.number().int().nonnegative(), total: z.number().int().nonnegative(), scope: z.string(), owner: z.string(), expires: z.number() });
const jobSchema = z.object({
  id: z.string(), scope: z.string(), owner: z.string(), key: z.uuid(), expires: z.number(), name: z.string().min(1).max(240), modified: z.number(), size: z.number().int().positive(),
  mime: z.enum(mediaTypes), caption: z.string().max(240), status: z.enum(["queued", "sending", "processing", "waiting", "failed"]), progress: z.number().min(0).max(100), error: z.string().max(1000), stored: z.uuid().optional(),
  attempts: z.number().int().min(0).max(100000), retryAt: z.number().nonnegative(), queuedAt: z.number().nonnegative(),
  allocation: z.object({ id: z.uuid(), path: z.string().max(1024), uploaded: z.boolean(), uploadUrl: z.string().max(2048).optional(), expiresAt: z.string().optional() }).optional(),
});

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const jobs = request.result.createObjectStore("jobs", { keyPath: "id" });
      jobs.createIndex("scope", "scope");
      request.result.createObjectStore("files");
      request.result.createObjectStore("batches", { keyPath: "scope" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(storageError());
    request.onblocked = () => reject(storageError());
  });
}

async function transact<T>(run: (transaction: IDBTransaction, result: (value: T) => void) => void): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(["jobs", "files", "batches"], "readwrite");
      let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () => reject(storageError());
      try { run(tx, result => { value = result; }); } catch { tx.abort(); }
    });
  } finally { db.close(); }
}

/** A new authenticated owner cannot inherit the previous person's local files. */
export async function clearUploadStorage(owner?: string) {
  await transact<void>((tx, done) => {
    const request = tx.objectStore("jobs").openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { done(); return; }
      const parsed = jobSchema.safeParse(cursor.value), job = cursor.value as StoredJob;
      if (!owner || !parsed.success || job.owner !== owner || job.expires <= Date.now()) {
        tx.objectStore("files").delete(cursor.primaryKey); cursor.delete();
      }
      cursor.continue();
    };
    const batches = tx.objectStore("batches").openCursor();
    batches.onsuccess = () => {
      const cursor = batches.result;
      if (!cursor) return;
      const batch = cursor.value as StoredBatch;
      if (!owner || batch.owner !== owner || batch.expires <= Date.now()) cursor.delete();
      cursor.continue();
    };
  });
}

/** File bytes are written once; progress/checkpoints never copy a whole video. */
export function browserUploadStore(owner: string, scope: string): UploadStore {
  const id = (key: string) => scope + ":" + key;
  const metadata = (job: UploadJob): StoredJob => {
    const { file, ...rest } = job;
    return { ...rest, id: id(job.key), scope, owner, expires: job.queuedAt + TTL, name: file.name, modified: file.lastModified, size: file.size };
  };
  const writeBatch = (tx: IDBTransaction, batch: UploadBatch) => tx.objectStore("batches").put({ ...batch, scope, owner, expires: Date.now() + TTL });
  return {
    load: () => transact((tx, done) => {
      const batch = tx.objectStore("batches").get(scope);
      const jobs = tx.objectStore("jobs").index("scope").getAll(scope);
      const restored: UploadJob[] = [];
      const result: { jobs: UploadJob[]; batch: UploadBatch; warning?: string } = { jobs: restored, batch: { paused: false, completed: 0, total: 0 } };
      jobs.onsuccess = () => {
        const parsedBatch = batchSchema.safeParse(batch.result);
        result.batch = parsedBatch.success && parsedBatch.data.owner === owner && parsedBatch.data.expires > Date.now() ? parsedBatch.data : { paused: false, completed: 0, total: jobs.result.length };
        for (const value of jobs.result as StoredJob[]) {
          const parsed = jobSchema.safeParse(value);
          const row = parsed.success ? parsed.data : value;
          const unavailable = () => {
            tx.objectStore("jobs").delete(row.id); tx.objectStore("files").delete(row.id);
            result.warning = "Some saved files are no longer available on this device. Choose them again to add them.";
            result.batch.total = Math.max(result.batch.completed, result.batch.total - 1);
          };
          if (!parsed.success) { unavailable(); continue; }
          if (row.owner !== owner || row.scope !== scope || row.expires <= Date.now()) {
            tx.objectStore("jobs").delete(row.id); tx.objectStore("files").delete(row.id); continue;
          }
          const file = tx.objectStore("files").get(row.id);
          file.onsuccess = () => {
            if (!(file.result instanceof Blob) || file.result.size !== row.size) { unavailable(); return; }
            try { validateUpload(row.name, row.mime, row.size); } catch { unavailable(); return; }
            restored.push({ key: row.key, mime: row.mime, caption: row.caption, file: new File([file.result], row.name, { type: row.mime, lastModified: row.modified }),
              status: row.status === "failed" ? "failed" : "queued", error: row.error, progress: row.allocation?.uploaded ? 100 : 0,
              stored: row.stored, allocation: row.allocation, attempts: row.attempts, retryAt: Math.min(row.retryAt, Date.now() + 300000), queuedAt: row.queuedAt });
            // IndexedDB requests finish before the transaction's completion callback.
          };
        }
        done(result);
      };
    }),
    add: (jobs, batch) => transact<void>((tx, done) => {
      const all = tx.objectStore("jobs").getAll();
      all.onsuccess = () => {
        const bytes = (all.result as StoredJob[]).reduce((sum, job) => sum + job.size, 0);
        if (all.result.filter((job: StoredJob) => job.scope === scope).length + jobs.length > 30 || all.result.length + jobs.length > 90 || bytes + jobs.reduce((sum, job) => sum + job.file.size, 0) > MAX_BYTES) { tx.abort(); return; }
        for (const job of jobs) { tx.objectStore("jobs").add(metadata(job)); tx.objectStore("files").add(job.file, id(job.key)); }
        writeBatch(tx, batch); done();
      };
    }),
    save: job => transact<void>((tx, done) => { tx.objectStore("jobs").put(metadata(job)); done(); }),
    batch: batch => transact<void>((tx, done) => { writeBatch(tx, batch); done(); }),
    remove: (key, batch) => transact<void>((tx, done) => { tx.objectStore("jobs").delete(id(key)); tx.objectStore("files").delete(id(key)); writeBatch(tx, batch); done(); }),
  };
}
