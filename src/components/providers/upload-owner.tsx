"use client";
import { createContext, useContext, useEffect } from "react";
import { signOutAction } from "@/app/actions/auth";
import { clearUploadStorage } from "@/lib/entries/upload-store";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const UploadOwner = createContext<string | null>(null);
export const uploadStopEvent = "us-together-stop-uploads";

async function forgetUploads() {
  window.dispatchEvent(new Event(uploadStopEvent));
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(uploadStopEvent);
  channel?.postMessage("stop"); channel?.close();
  await clearUploadStorage();
}

export function UploadOwnerProvider({ owner, children }: { owner: string; children: React.ReactNode }) {
  useEffect(() => {
    if (owner === "local-test-user") return;
    const { data } = createBrowserSupabaseClient().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (session && session.user.id !== owner)) void forgetUploads().catch(() => {});
    });
    return () => data.subscription.unsubscribe();
  }, [owner]);
  return <UploadOwner.Provider value={owner}>{children}</UploadOwner.Provider>;
}
export function useUploadOwner() { return useContext(UploadOwner); }

/** Server sign-out cannot clear IndexedDB. Stop writers before clearing it here. */
export function UploadSignOutForm({ children, className }: { children: React.ReactNode; className?: string }) {
  return <form className={className} action={async () => {
    await forgetUploads().catch(() => {});
    await signOutAction();
  }}>{children}</form>;
}
