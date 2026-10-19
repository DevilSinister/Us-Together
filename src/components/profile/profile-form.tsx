"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { updateProfileAction } from "@/app/actions/profile";
import { initialActionState } from "@/lib/auth/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { DeviceTimeZoneField } from "@/components/profile/device-time-zone-field";
import { AvatarField } from "@/components/profile/avatar-field";
import { initials } from "@/lib/avatar/styles";

export function ProfileForm({ displayName, timezone, avatarSrc = null }: { displayName: string; timezone: string; avatarSrc?: string | null }) {
  const [state, action] = useActionState(updateProfileAction, initialActionState);

  return (
    <form action={action} className="space-y-5" noValidate>
      <AvatarField name="avatar" label="Your photo" currentSrc={avatarSrc} fallback={initials(displayName) || "U"} previewAlt="Your profile photo" />
      <div className="space-y-2">
        <Label htmlFor="displayName">Your name</Label>
        <Input id="displayName" name="displayName" defaultValue={displayName} autoComplete="name" required aria-invalid={Boolean(state.fields?.displayName)} />
        {state.fields?.displayName ? <p className="field-error">{state.fields.displayName[0]}</p> : null}
      </div>
      <DeviceTimeZoneField saved={timezone} />
      {state.message ? <div className={state.status === "success" ? "status-message status-success" : "status-message status-error"} role={state.status === "success" ? "status" : "alert"}>{state.status === "success" ? <CircleCheck className="size-5 shrink-0" aria-hidden="true" /> : <CircleAlert className="size-5 shrink-0" aria-hidden="true" />}{state.message}</div> : null}
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}
