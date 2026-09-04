"use client";
import { createContext, useContext, useEffect, useEffectEvent, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { startPartnerRefresh } from "@/lib/partner-sync";

const SyncEnabled = createContext(false);

export function usePartnerRefresh(refresh: () => Promise<void> | void, paused = false) {
  const enabled = useContext(SyncEnabled);
  const run = useEffectEvent(async () => { if (!paused) await refresh(); });
  useEffect(() => {
    if (!enabled) return;
    return startPartnerRefresh(() => run(), () => document.visibilityState === "visible" && navigator.onLine, window, document);
  }, [enabled]);
}

function ServerRefresh() {
  const router = useRouter(), pathname = usePathname();
  const [pending, start] = useTransition();
  usePartnerRefresh(() => {
    if (/\/(new|edit)$/.test(pathname) || document.activeElement?.matches("input,textarea,select,[contenteditable=true]")) return;
    start(() => router.refresh());
  }, pending);
  return null;
}

export function PartnerSync({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return <SyncEnabled.Provider value={enabled}><ServerRefresh />{children}</SyncEnabled.Provider>;
}
