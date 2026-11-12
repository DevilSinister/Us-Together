"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Lock } from "lucide-react";
import { unlockPrivacyArea } from "@/app/actions/privacy";
import { codeFromDevice, hasDeviceUnlock } from "@/lib/privacy/device-unlock";
import { lockAreas, type LockArea } from "@/lib/privacy/areas";
import { PinPad } from "@/components/privacy/pin-pad";
import { Button } from "@/components/ui/button";

/**
 * A locked section (ADR-053): a lock mark, "{Section} is locked", the dots and
 * the heart keypad, with device unlock in the pad's bottom-left key where this
 * browser has it. A PIN of known length opens the section as soon as its last
 * digit goes in; an older PIN of unknown length keeps an Open button.
 */
export function UnlockPanel({ area, userId, pinLength }: { area: LockArea; userId: string; pinLength: 4 | 6 | null }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [device, setDevice] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setDevice(hasDeviceUnlock(userId)), 0); return () => window.clearTimeout(timer); }, [userId]);
  const label = lockAreas.find((item) => item.id === area)?.label ?? "This section";
  async function submit(value: string) {
    setBusy(true); setMessage("");
    const result = await unlockPrivacyArea({ area, code: value });
    setBusy(false); setPin("");
    if (result.error) setMessage(result.error);
    else router.refresh();
  }
  function change(value: string) {
    setPin(value);
    if (pinLength && value.length === pinLength && !busy) void submit(value);
  }
  const pinValid = pinLength ? pin.length === pinLength : pin.length === 4 || pin.length >= 6 && pin.length <= 12;
  const deviceKey = device ? (
    <button
      type="button"
      aria-label="Use this device's unlock instead"
      disabled={busy}
      onClick={async () => { try { await submit(await codeFromDevice(userId)); } catch (error) { setMessage(error instanceof Error ? error.message : "Device unlock failed."); } }}
      className="grid h-[4.75rem] w-[5.25rem] place-items-center rounded-control text-foreground transition-colors duration-150 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 motion-reduce:transition-none"
    >
      <Fingerprint aria-hidden="true" className="size-[1.375rem]" />
    </button>
  ) : null;

  return <div className="reveal-on-load mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-[1.125rem] px-5 py-6 text-center">
    <span className="grid size-11 place-items-center rounded-full bg-secondary"><Lock aria-hidden="true" className="size-5" /></span>
    <div>
      <h1 className="font-display text-[1.75rem] leading-[1.15] tracking-[-0.01em]">{label} is locked</h1>
      <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">Enter your PIN to open it for five minutes</p>
    </div>
    <form method="post" className="flex w-full flex-col items-center gap-4" onSubmit={(event) => { event.preventDefault(); if (pinValid) void submit(pin); }}>
      <PinPad value={pin} onChange={change} length={pinLength} label="Privacy PIN" disabled={busy} leading={deviceKey} />
      {message ? <p role="alert" className="text-sm text-danger">{message}</p> : <p role="status" className="sr-only">{busy ? "Checking your PIN…" : ""}</p>}
      {pinLength ? null : <Button className="w-full max-w-[17.5rem]" type="submit" disabled={busy || !pinValid}>Open {label}</Button>}
    </form>
    <p className="max-w-[34ch] text-xs leading-5 text-muted-foreground">Device unlock uses this phone&rsquo;s fingerprint, face or screen lock where it has been set up. Your PIN always works.</p>
  </div>;
}
