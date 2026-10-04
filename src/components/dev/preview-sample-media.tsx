"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addPreviewMedia, previewMedia } from "@/lib/entries/preview-media";
import type { EntryAccess } from "@/lib/entries/types";

const entries = [
  { kind: "memory" as const, id: "00000000-0000-4000-8000-000000000402", palette: ["#7b1836", "#edac8a"], caption: "A warm cup by the window" },
  { kind: "memory" as const, id: "00000000-0000-4000-8000-000000000403", palette: ["#d27957", "#ffe1a8"], caption: "Sunday in the kitchen" },
  { kind: "moment" as const, id: "00000000-0000-4000-8000-000000000404", palette: ["#345c70", "#c8e4db"], caption: "A view worth the early train" },
  { kind: "moment" as const, id: "00000000-0000-4000-8000-000000000405", palette: ["#4d2943", "#f3b6b1"], caption: "A quiet night together" },
];

async function samplePhoto(palette: string[], index: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 960; canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Preview canvas is unavailable.");
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, palette[0]); gradient.addColorStop(1, palette[1]);
  context.fillStyle = gradient; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,.22)";
  context.beginPath(); context.arc(700 - index * 45, 190 + index * 55, 220, 0, Math.PI * 2); context.fill();
  context.fillStyle = "rgba(255,255,255,.7)";
  context.fillRect(86, 492, 340, 8); context.fillRect(86, 524, 220, 8);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not create preview photo.")), "image/jpeg", .86));
  return new File([blob], `sample-${index + 1}.jpg`, { type: "image/jpeg" });
}

/** Local-only media so the paired developer preview opens with photo-rich entries. */
export function PreviewSampleMedia({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const seededSession = useRef<string | null>(null);

  useEffect(() => {
    if (seededSession.current === sessionId) return;
    seededSession.current = sessionId;
    let mounted = true;
    void Promise.all(entries.map(async (entry) => {
      const access: EntryAccess = { kind: entry.kind, id: entry.id, previewSession: sessionId };
      const existing = await previewMedia(access);
      for (const item of existing) { if (item.url) URL.revokeObjectURL(item.url); if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); }
      if (existing.length) return;
      for (let index = 0; index < 3; index++) await addPreviewMedia(access, await samplePhoto(entry.palette, index), index === 0 ? entry.caption : "");
    })).then(() => { if (mounted) router.refresh(); });
    return () => { mounted = false; };
  }, [router, sessionId]);
  return null;
}
