"use client";

import { useActionState, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { updateProfileAction } from "@/app/actions/profile";
import { initialActionState } from "@/lib/auth/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";

export function ProfileForm({ displayName, timezone }: { displayName: string; timezone: string }) {
  const [state, action] = useActionState(updateProfileAction, initialActionState);
  const [detectedTimezone, setDetectedTimezone] = useState(timezone);

  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="displayName">Your name</Label>
        <Input id="displayName" name="displayName" defaultValue={displayName} autoComplete="name" required aria-invalid={Boolean(state.fields?.displayName)} />
        {state.fields?.displayName ? <p className="field-error">{state.fields.displayName[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Input id="timezone" name="timezone" value={detectedTimezone} onChange={(event) => setDetectedTimezone(event.target.value)} required aria-describedby="timezone-help" />
        <p id="timezone-help" className="text-xs leading-5 text-muted-foreground">Use an IANA timezone such as Asia/Karachi or Europe/London.</p>
        <Button type="button" variant="ghost" size="sm" className="px-0" onClick={() => setDetectedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")}>Use my device timezone</Button>
      </div>
      {state.message ? <div className={state.status === "success" ? "status-message status-success" : "status-message status-error"} role={state.status === "success" ? "status" : "alert"}>{state.status === "success" ? <CircleCheck className="size-5 shrink-0" aria-hidden="true" /> : <CircleAlert className="size-5 shrink-0" aria-hidden="true" />}{state.message}</div> : null}
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}
