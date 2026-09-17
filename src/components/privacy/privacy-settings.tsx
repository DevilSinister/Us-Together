"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Heart, LockKeyhole } from "lucide-react";
import { changePrivacyPin, configurePrivacyLocks, verifyPrivacyCode } from "@/app/actions/privacy";
import { enrollDeviceUnlock, hasDeviceUnlock, removeDeviceUnlock } from "@/lib/privacy/device-unlock";
import { lockAreas, type LockArea } from "@/lib/privacy/areas";
import { PinPad } from "@/components/privacy/pin-pad";
import { Button } from "@/components/ui/button";

type Flow = "setup-length" | "setup-create" | "setup-confirm" | "areas-current" | "change-current" | "change-length" | "change-create" | "change-confirm" | "device-current" | null;
const currentPinValid = (value: string, length: 4 | 6 | null) => length ? value.length === length : value.length === 4 || value.length >= 6 && value.length <= 12;

export function PrivacySettings({ configured, initialAreas, pinLength, userId }: { configured: boolean; initialAreas: LockArea[]; pinLength: 4 | 6 | null; userId: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(configured);
  const [areas, setAreas] = useState(initialAreas);
  const [savedAreas, setSavedAreas] = useState(initialAreas);
  const [currentLength, setCurrentLength] = useState(pinLength);
  const [newLength, setNewLength] = useState<4 | 6>(6);
  const [flow, setFlow] = useState<Flow>(configured ? null : "setup-length");
  const [entry, setEntry] = useState("");
  const [draftPin, setDraftPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [deviceReady, setDeviceReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setDeviceReady(hasDeviceUnlock(userId)), 0); return () => window.clearTimeout(timer); }, [userId]);
  const updateArea = (area: LockArea) => setAreas((current) => current.includes(area) ? current.filter((item) => item !== area) : [...current, area]);
  const start = (next: Flow) => { setFlow(next); setEntry(""); setDraftPin(""); setCurrentPin(""); setMessage(""); };
  const finish = (text: string) => { setFlow(null); setEntry(""); setDraftPin(""); setCurrentPin(""); setMessage(text); router.refresh(); };
  const valid = flow === "setup-create" || flow === "setup-confirm" || flow === "change-create" || flow === "change-confirm"
    ? entry.length === newLength : currentPinValid(entry, currentLength);
  async function next() {
    if (!valid || busy) return;
    setMessage("");
    if (flow === "setup-create") { setDraftPin(entry); setEntry(""); setFlow("setup-confirm"); return; }
    if (flow === "change-create") { setDraftPin(entry); setEntry(""); setFlow("change-confirm"); return; }
    if (flow === "setup-confirm" || flow === "change-confirm") {
      if (entry !== draftPin) { setEntry(""); setMessage("PINs did not match. Try confirming again."); return; }
    }
    setBusy(true);
    try {
      if (flow === "setup-confirm") {
        const result = await configurePrivacyLocks({ code: draftPin, areas });
        if (result.error) { setMessage(result.error); return; }
        setReady(true); setCurrentLength(newLength); setSavedAreas(areas);
        finish("PIN created. Your selected sections now ask for it when opened.");
      } else if (flow === "areas-current") {
        const result = await configurePrivacyLocks({ code: entry, areas });
        if (result.error) { setMessage(result.error); setEntry(""); return; }
        setSavedAreas(areas); finish("Lock choices saved.");
      } else if (flow === "change-current") {
        const result = await verifyPrivacyCode(entry);
        if (result.error) { setMessage(result.error); setEntry(""); return; }
        setCurrentPin(entry); setEntry(""); setFlow("change-length");
      } else if (flow === "change-confirm") {
        const result = await changePrivacyPin({ current_code: currentPin, new_code: draftPin });
        if (result.error) { setMessage(result.error); return; }
        removeDeviceUnlock(userId); setDeviceReady(false); setCurrentLength(newLength);
        finish("PIN changed. Device unlock was removed from this browser; set it up again if you want to use it.");
      } else if (flow === "device-current") {
        const result = await verifyPrivacyCode(entry);
        if (result.error) { setMessage(result.error); setEntry(""); return; }
        await enrollDeviceUnlock(userId, entry);
        setDeviceReady(true); finish("Device unlock is ready on this browser.");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not finish this step. Try again."); }
    finally { setBusy(false); }
  }
  const chooseLength = (length: 4 | 6) => { setNewLength(length); setEntry(""); setFlow(flow === "change-length" ? "change-create" : "setup-create"); };
  const flowTitle: Record<Exclude<Flow, null>, string> = {
    "setup-length": "Choose your PIN length", "setup-create": "Create your PIN", "setup-confirm": "Confirm your PIN",
    "areas-current": "Enter your current PIN", "change-current": "Enter your current PIN", "change-length": "Choose your new PIN length",
    "change-create": "Create a new PIN", "change-confirm": "Confirm your new PIN", "device-current": "Enter your PIN for device unlock",
  };
  const flowStep = flow === "setup-length" || flow === "change-length" ? 1 : flow === "setup-create" || flow === "change-create" ? 2 : flow === "setup-confirm" || flow === "change-confirm" ? 3 : null;
  const flowLength = flow === "setup-create" || flow === "setup-confirm" || flow === "change-create" || flow === "change-confirm" ? newLength : currentLength;
  return <div className="space-y-6">
    <section className="rounded-panel border bg-card p-6 shadow-paper sm:p-8">
      <div className="flex items-start gap-3"><LockKeyhole aria-hidden="true" className="mt-1 size-6 text-primary" /><div><h2 className="font-serif text-2xl">Choose what to lock.</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Your PIN belongs to your account. Your partner can choose their own locks.</p></div></div>
      <details className="mt-7 rounded-control border bg-background">
        <summary className="cursor-pointer px-4 py-4 font-medium focus-visible:outline-2 focus-visible:outline-ring">Sections to lock <span className="ml-2 text-sm text-muted-foreground">{areas.length} selected</span></summary>
        <div className="grid gap-1 border-t p-3 sm:grid-cols-2">
          {lockAreas.map((item) => <label key={item.id} className="flex min-h-14 cursor-pointer items-start gap-3 rounded-control p-3 hover:bg-secondary"><input type="checkbox" className="mt-1 size-4 accent-primary" checked={areas.includes(item.id)} onChange={() => updateArea(item.id)} /><span><span className="block text-sm font-medium">{item.label}</span><span className="block text-xs leading-5 text-muted-foreground">{item.detail}</span></span></label>)}
        </div>
      </details>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">Calendar and Our Story follow locks on their source content. The current Android app cannot unlock selected sections yet. Previously downloaded or cached files cannot be recalled.</p>
      {ready && flow === null ? <Button className="mt-5" disabled={areas.slice().sort().join() === savedAreas.slice().sort().join()} onClick={() => start("areas-current")}>Save lock choices</Button> : null}
    </section>
    {flow ? <section className="rounded-panel border bg-card px-5 py-8 text-center shadow-paper sm:px-8">
      <Heart aria-hidden="true" className="mx-auto mb-3 size-8 fill-primary/20 text-primary" />
      {flowStep ? <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Step {flowStep} of 3</p> : null}
      <h2 className="mt-2 font-serif text-2xl">{flowTitle[flow]}</h2>
      {flow === "setup-length" || flow === "change-length" ? <div className="mt-7 flex justify-center gap-4">{([4, 6] as const).map((length) => <button type="button" key={length} onClick={() => chooseLength(length)} className="relative flex size-28 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring"><Heart aria-hidden="true" className="absolute size-28 fill-primary/15 text-primary/70" /><span className="relative pt-3 font-semibold">{length} digits</span></button>)}</div>
        : <><div className="mt-4"><PinPad value={entry} onChange={setEntry} length={flowLength} label={flowTitle[flow]} disabled={busy} /></div>
          <Button className="mt-4 w-full max-w-[19rem]" disabled={!valid || busy} onClick={() => void next()}>{flow === "setup-confirm" ? "Create PIN" : flow === "change-confirm" ? "Change PIN" : flow === "areas-current" ? "Save choices" : flow === "device-current" ? "Set up device unlock" : "Continue"}</Button></>}
      {flow !== "setup-length" ? <div><Button className="mt-2" variant="ghost" disabled={busy} onClick={() => {
        setEntry(""); setMessage("");
        if (flow === "setup-create") setFlow("setup-length"); else if (flow === "setup-confirm") setFlow("setup-create");
        else if (flow === "change-length") setFlow("change-current"); else if (flow === "change-create") setFlow("change-length"); else if (flow === "change-confirm") setFlow("change-create");
        else setFlow(null);
      }}>Back</Button></div> : null}
      {message ? <p role="alert" className="mt-4 text-sm text-destructive">{message}</p> : null}
    </section> : null}
    {ready && flow === null ? <section className="rounded-panel border bg-card p-6 shadow-paper sm:p-8">
      <h2 className="font-serif text-2xl">Your PIN</h2>
      <p className="mt-2 text-sm text-muted-foreground">Use a 4- or 6-digit PIN. Keep it somewhere safe; there is no recovery yet.</p>
      <Button className="mt-5" variant="outline" onClick={() => start("change-current")}>Change PIN</Button>
    </section> : null}
    {ready && flow === null ? <section className="rounded-panel border bg-card p-6 shadow-paper sm:p-8">
      <div className="flex items-start gap-3"><Fingerprint aria-hidden="true" className="mt-1 size-6 text-primary" /><div><h2 className="font-serif text-2xl">Device unlock</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Where supported, use your device’s fingerprint, face or screen lock. Your PIN stays encrypted in this browser and is checked by the server.</p></div></div>
      {deviceReady ? <div className="mt-5"><p className="text-sm">Ready on this browser.</p><Button className="mt-3" variant="outline" onClick={() => { removeDeviceUnlock(userId); setDeviceReady(false); setMessage("Device unlock removed from this browser."); }}>Remove from this browser</Button></div>
        : <Button className="mt-5" variant="outline" onClick={() => start("device-current")}>Set up device unlock</Button>}
    </section> : null}
    {message && !flow ? <p role="status" className="text-sm">{message}</p> : null}
  </div>;
}
