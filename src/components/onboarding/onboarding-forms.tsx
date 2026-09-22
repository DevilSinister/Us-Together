"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleAlert, ImagePlus, Link2, UsersRound } from "lucide-react";
import type { ActionState } from "@/lib/auth/types";
import { initialActionState } from "@/lib/auth/types";
import { createCoupleAction, joinCoupleAction, saveOnboardingProfileAction, saveRelationshipAction } from "@/app/actions/onboarding";
import { savePartnerPresentationAction } from "@/app/actions/partner";
import { avatarStyles as avatarStyleValues, avatarStyleClasses, avatarStyleLabels, initials } from "@/lib/avatar/styles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/auth/submit-button";
import { cn } from "@/lib/utils";

// The four colours moved to lib/avatar/styles so the Avatar, this picker and
// the profile editor cannot drift, and so they finally carry dark-mode pairs.
const avatarStyles = avatarStyleValues.map((value) => ({
  value,
  label: avatarStyleLabels[value],
  className: avatarStyleClasses[value],
}));

function FormMessage({ state }: { state: ActionState }) {
  return state.message ? <div className="status-message status-error" role="alert"><CircleAlert className="size-5 shrink-0" aria-hidden="true" />{state.message}</div> : null;
}

export function ProfileStepForm({ displayName, timezone, avatarStyle }: { displayName: string; timezone: string; avatarStyle: string }) {
  const [state, action] = useActionState(saveOnboardingProfileAction, initialActionState);
  const [name, setName] = useState(displayName);
  const [preview, setPreview] = useState<string | null>(null);
  const initial = name.trim().slice(0, 1).toUpperCase() || "U";

  return (
    <form action={action} className="space-y-6" noValidate>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-display text-4xl text-primary">
          {preview ? <Image src={preview} alt="Selected profile preview" width={96} height={96} unoptimized className="size-full object-cover" /> : initial}
        </div>
        <div className="min-w-0 flex-1">
          <Label htmlFor="avatar">Profile photo <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <label htmlFor="avatar" className="mt-2 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-field px-4 text-sm font-semibold hover:bg-secondary focus-within:ring-2 focus-within:ring-ring">
            <ImagePlus className="size-4" aria-hidden="true" />Choose a photo
            <input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return setPreview(null);
              const reader = new FileReader();
              reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
              reader.readAsDataURL(file);
            }} />
          </label>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">JPG, PNG, or WebP. Maximum 2 MB.</p>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Avatar color</legend>
        <div className="mt-3 flex gap-3">
          {avatarStyles.map((style) => <label key={style.value} className="cursor-pointer"><input type="radio" name="avatarStyle" value={style.value} defaultChecked={avatarStyle === style.value} className="peer sr-only" /><span className={cn("grid size-11 place-items-center rounded-full text-sm font-bold ring-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-checked:ring-2 peer-checked:ring-primary", style.className)}>{initial}</span><span className="sr-only">{style.label}</span></label>)}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="displayName">What should we call you?</Label>
        <Input id="displayName" name="displayName" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required aria-invalid={Boolean(state.fields?.displayName)} />
        {state.fields?.displayName ? <p className="field-error">{state.fields.displayName[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Input id="timezone" name="timezone" defaultValue={timezone} required aria-invalid={Boolean(state.fields?.timezone)} />
        <p className="text-xs leading-5 text-muted-foreground">Used to show plans and reminders at the right local time.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Continue</SubmitButton>
    </form>
  );
}

export function RelationshipStepForm({ startedOn }: { startedOn: string }) {
  const [state, action] = useActionState(saveRelationshipAction, initialActionState);
  return (
    <form action={action} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="relationshipStartedOn">When did your story begin? <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input id="relationshipStartedOn" name="relationshipStartedOn" type="date" defaultValue={startedOn} aria-invalid={Boolean(state.fields?.relationshipStartedOn)} />
        <p className="text-xs leading-5 text-muted-foreground">This powers your relationship counter. You can change it later.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Continue to partner setup</SubmitButton>
    </form>
  );
}

export function ConnectStepForms() {
  const [createState, createAction] = useActionState(createCoupleAction, initialActionState);
  const [joinState, joinAction] = useActionState(joinCoupleAction, initialActionState);
  return (
    <div className="space-y-8">
      <section className="border-b pb-8">
        <div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Link2 className="size-5" /></span><div><h2 className="font-display text-2xl">Invite your partner</h2><p className="mt-1 leading-7 text-muted-foreground">Create your shared space and get a private six-digit code.</p></div></div>
        <form action={createAction} className="mt-5"><SubmitButton>Create invitation code</SubmitButton></form>
        <FormMessage state={createState} />
      </section>
      <section>
        <div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary"><UsersRound className="size-5" /></span><div><h2 className="font-display text-2xl">I have a code</h2><p className="mt-1 leading-7 text-muted-foreground">Join the private space your partner already created.</p></div></div>
        <form action={joinAction} className="mt-5 space-y-4" noValidate>
          <div className="space-y-2"><Label htmlFor="pairingCode">Pairing code</Label><Input id="pairingCode" name="pairingCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" className="text-center font-display text-2xl tracking-[0.3em]" aria-invalid={Boolean(joinState.fields?.pairingCode)} />{joinState.fields?.pairingCode ? <p className="field-error">{joinState.fields.pairingCode[0]}</p> : null}</div>
          <Button type="submit" variant="outline" className="w-full">Join shared space</Button>
          <FormMessage state={joinState} />
        </form>
      </section>
    </div>
  );
}

/**
 * Who you are doing this with.
 *
 * Its own step rather than part of Connect, because Connect is transactional:
 * the pairing RPCs refuse for ordinary reasons - an invite cooldown, an attempt
 * window, an expired code - and folding a file upload into a form that gets
 * retried would orphan an object on every retry. This step only writes the
 * caller's own row, is idempotent, and cannot fail for pairing reasons.
 *
 * It also works before the partner has an account, which is the point: you can
 * name them while you are still waiting for them to join.
 */
export function PartnerStepForm({ partnerName, partnerAvatarStyle, returnTo = "onboarding" }: { partnerName: string; partnerAvatarStyle: string; returnTo?: "onboarding" | "profile" }) {
  const [state, action] = useActionState(savePartnerPresentationAction, initialActionState);
  const [name, setName] = useState(partnerName);
  const [preview, setPreview] = useState<string | null>(null);
  const initial = initials(name) || "?";

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-display text-4xl text-primary">
          {preview ? <Image src={preview} alt="Selected partner photo preview" width={96} height={96} unoptimized className="size-full object-cover" /> : initial}
        </div>
        <div className="min-w-0 flex-1">
          <Label htmlFor="partnerAvatar">Their photo <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <label htmlFor="partnerAvatar" className="mt-2 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control border bg-field px-4 text-sm font-semibold hover:bg-secondary focus-within:ring-2 focus-within:ring-ring">
            <ImagePlus className="size-4" aria-hidden="true" />Choose a photo
            <input id="partnerAvatar" name="partnerAvatar" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return setPreview(null);
              const reader = new FileReader();
              reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
              reader.readAsDataURL(file);
            }} />
          </label>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">JPG, PNG, or WebP. Maximum 2 MB.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="partnerName">What you call them <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input id="partnerName" name="partnerName" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="off" aria-invalid={Boolean(state.fields?.partnerName)} />
        {state.fields?.partnerName ? <p className="field-error">{state.fields.partnerName[0]}</p> : null}
        <p className="text-xs leading-5 text-muted-foreground">Leave it blank and they will appear by the name they choose for themselves.</p>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Their colour</legend>
        <div className="mt-3 flex gap-3">
          {avatarStyles.map((style) => <label key={style.value} className="cursor-pointer"><input type="radio" name="partnerAvatarStyle" value={style.value} defaultChecked={partnerAvatarStyle === style.value} className="peer sr-only" /><span className={cn("grid size-11 place-items-center rounded-full text-sm font-bold ring-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-checked:ring-2 peer-checked:ring-primary", style.className)}>{initial}</span><span className="sr-only">{style.label}</span></label>)}
        </div>
      </fieldset>

      <FormMessage state={state} />

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>{returnTo === "profile" ? "Save" : "Save and continue"}</SubmitButton>
        {returnTo === "onboarding" ? <Button asChild variant="ghost"><Link href="/onboarding?step=connect">I&rsquo;ll add this later</Link></Button> : null}
      </div>
    </form>
  );
}
