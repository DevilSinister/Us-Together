"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { unlockPrivacyArea } from "@/app/actions/privacy";
import { codeFromDevice, hasDeviceUnlock } from "@/lib/privacy/device-unlock";
import { lockAreas, type LockArea } from "@/lib/privacy/areas";
import { PinPad } from "@/components/privacy/pin-pad";
import { Button } from "@/components/ui/button";

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
  const pinValid = pinLength ? pin.length === pinLength : pin.length === 4 || pin.length >= 6 && pin.length <= 12;
  return <div className="mx-auto flex min-h-[65vh] max-w-md flex-col justify-center px-4 py-10">
    <div className="rounded-panel border bg-card px-5 py-8 text-center shadow-paper sm:px-9">
      <Heart aria-hidden="true" className="mx-auto mb-4 size-9 fill-primary/20 text-primary" />
      <h1 className="font-serif text-3xl">{label} is locked.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">A little privacy, just for you. Enter your PIN to open this section for five minutes.</p>
      <form method="post" className="mt-5" onSubmit={(event) => { event.preventDefault(); if (pinValid) void submit(pin); }}>
        <PinPad value={pin} onChange={setPin} length={pinLength} label="Privacy PIN" disabled={busy} />
        {message ? <p role="alert" className="mt-3 text-sm text-destructive">{message}</p> : null}
        <Button className="mt-5 w-full" type="submit" disabled={busy || !pinValid}>Open {label}</Button>
      </form>
      {device ? <Button className="mt-3 w-full" variant="outline" disabled={busy} onClick={async () => { try { await submit(await codeFromDevice(userId)); } catch (error) { setMessage(error instanceof Error ? error.message : "Device unlock failed."); } }}>Use device unlock</Button> : null}
      <p className="mt-5 text-xs leading-5 text-muted-foreground">Device unlock can use a fingerprint, face or screen lock. Your PIN always works.</p>
    </div>
  </div>;
}
