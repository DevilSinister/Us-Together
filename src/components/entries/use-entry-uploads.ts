"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { addPreviewMedia } from "@/lib/entries/preview-media";
import { startTransfer, TransferCancelled } from "@/lib/entries/media-transfer";
import { browserUploadStore, clearUploadStorage } from "@/lib/entries/upload-store";
import { UploadSession, type UploadSnapshot } from "@/lib/entries/upload-session";
import { uploadRequest } from "@/lib/entries/upload-client";
import type { QueuedPhoto } from "@/lib/entries/upload-queue";
import type { EntryAccess } from "@/lib/entries/types";
import { useUploadOwner, uploadStopEvent } from "@/components/providers/upload-owner";
import { queueFiles } from "./photo-picker";

const empty: UploadSnapshot = { items: [], paused: false, waiting: false, completed: 0, total: 0, error: "", ready: false };

/** Reopening this entry recovers its durable, account-scoped queue under one Web Lock. */
export function useEntryUploads({ access, initial, onSaved }: { access: EntryAccess; initial: QueuedPhoto[]; onSaved: () => Promise<void> }) {
  const owner = useUploadOwner();
  const { kind, id, previewSession } = access;
  const [snapshot, setSnapshot] = useState<UploadSnapshot>(empty);
  const [generation, setGeneration] = useState(0);
  const session = useRef<UploadSession | null>(null);
  const saved = useRef(onSaved), first = useRef(initial);
  useEffect(() => { saved.current = onSaved; }, [onSaved]);
  useEffect(() => {
    if (!owner) return;
    let stopped = false, retry: ReturnType<typeof setTimeout> | undefined;
    let release: (() => void) | undefined;
    const a: EntryAccess = { kind, id, previewSession };
    const scope = (previewSession ? "preview:" + previewSession : owner) + ":" + kind + ":" + id;
    const stop = () => { stopped = true; void session.current?.dispose(); release?.(); if (retry) clearTimeout(retry); };
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(uploadStopEvent);
    if (channel) channel.onmessage = stop;
    window.addEventListener(uploadStopEvent, stop);
    window.addEventListener("pagehide", stop);
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted) setGeneration(value => value + 1); };
    window.addEventListener("pageshow", pageshow);
    const wake = () => { if (document.visibilityState === "visible") session.current?.wake(); };
    window.addEventListener("online", wake); document.addEventListener("visibilitychange", wake);
    const timer = setInterval(wake, 5000);
    const open = async () => {
      if (stopped) return;
      if (!navigator.locks) { setSnapshot({ ...empty, error: "This browser cannot safely recover uploads. Update your browser and try again." }); return; }
      await navigator.locks.request("us-together-uploads:" + scope, { ifAvailable: true }, async lock => {
        if (stopped) return;
        if (!lock) {
          setSnapshot({ ...empty, error: "These uploads are open in another tab. Close that tab to continue here." });
          retry = setTimeout(() => void open(), 500); return;
        }
        const lifetime = new Promise<void>(resolve => { release = resolve; });
        try {
          await clearUploadStorage(owner);
          if (stopped) return;
          const control = new UploadSession(browserUploadStore(owner, scope), {
            prepare: async job => {
              if (previewSession) return { id: job.key, path: "preview", uploaded: true };
              const result = await uploadRequest({ operation: "prepare", id: job.key, kind, memoryId: id, filename: job.file.name, mime: job.mime, size: job.file.size, caption: job.caption }, owner);
              if (!result.id || !result.path) throw Error("Could not start this upload. Try again.");
              if (result.id !== job.key) throw Error("Uploads need the latest service update. Try again after the app is updated.");
              return { id: result.id, path: result.path, expiresAt: result.expiresAt, uploaded: result.uploaded ?? false };
            },
            transfer: async (job, allocation, onProgress, onUploadUrl) => startTransfer({ file: job.file, mime: job.mime,
              bucket: kind === "moment" ? "moment-media" : "memory-media", objectName: allocation.path,
              auth: createBrowserSupabaseClient().auth, uploadUrl: allocation.uploadUrl, onProgress, onUploadUrl }),
            finalize: async (job, allocation) => {
              if (previewSession) await addPreviewMedia(a, job.file, job.caption, job.key);
              else await uploadRequest({ operation: "finalize", kind, memoryId: id, id: allocation.id }, owner);
            },
            remove: async job => {
              if (previewSession) return;
              try { await uploadRequest({ operation: "remove", kind, memoryId: id, id: job.allocation?.id ?? job.key }, owner); }
              catch (error) { if (!(error instanceof Error) || !error.message.includes("Media unavailable")) throw error; }
            },
            saved: () => saved.current(),
          }, value => { if (!stopped) setSnapshot(value); });
          session.current = control;
          await control.initialize(first.current);
          await lifetime;
          await control.dispose();
        } catch (error) {
          if (!stopped && !(error instanceof TransferCancelled)) setSnapshot({ ...empty, error: error instanceof Error ? error.message : "Could not open saved uploads. Reload and try again." });
        }
      });
    };
    void open();
    return () => {
      stop(); channel?.close(); clearInterval(timer);
      window.removeEventListener(uploadStopEvent, stop); window.removeEventListener("pagehide", stop);
      window.removeEventListener("pageshow", pageshow);
      window.removeEventListener("online", wake); document.removeEventListener("visibilitychange", wake);
    };
  }, [owner, kind, id, previewSession, generation]);

  const add = useCallback(async (files: File[]) => {
    if (!session.current) throw Error("Your saved uploads are still opening. Try again in a moment.");
    const photos = queueFiles([], files);
    await session.current.add(photos);
  }, []);
  const run = (action: Promise<void> | undefined) => action?.catch(error => {
    setSnapshot(value => ({ ...value, error: error instanceof Error ? error.message : "Could not save upload progress. Try again." }));
  });
  return { ...snapshot, add,
    recover: () => setGeneration(value => value + 1),
    pause: () => run(session.current?.pause()), resume: () => run(session.current?.resume()),
    retry: (key?: string) => run(session.current?.retry(key)), remove: (key: string) => run(session.current?.remove(key)) };
}
