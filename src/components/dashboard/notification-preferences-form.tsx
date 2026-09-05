"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { updateNotificationPreferencesAction } from "@/app/actions/dashboard";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialActionState } from "@/lib/auth/types";

type Preferences = { inAppEnabled: boolean; plansEnabled: boolean; memoriesEnabled: boolean; milestonesEnabled: boolean; notesEnabled: boolean; onThisDayEnabled: boolean };
const options: Array<{ name: keyof Preferences; label: string; copy: string }> = [
  { name: "plansEnabled", label: "Plans", copy: "Changes to shared plans and reminders." },
  { name: "memoriesEnabled", label: "Memories", copy: "New shared memories and follow-ups." },
  { name: "milestonesEnabled", label: "Moments", copy: "New moments added to your shared timeline." },
  { name: "notesEnabled", label: "Notes", copy: "Shared-note activity when notes arrive in a later phase." },
  { name: "onThisDayEnabled", label: "On this day", copy: "A moment or memory from this date in an earlier year." },
];

export function NotificationPreferencesForm({ preferences }: { preferences: Preferences }) {
  const [state, action] = useActionState(updateNotificationPreferencesAction, initialActionState);
  return <form action={action} className="space-y-5">
    <label className="flex items-start gap-3 border-b pb-5"><input type="checkbox" name="inAppEnabled" defaultChecked={preferences.inAppEnabled} className="mt-1 size-5 accent-[var(--primary)]" /><span><strong className="block">In-app notifications</strong><span className="mt-1 block text-sm leading-6 text-muted-foreground">Turn off every in-app notification without changing category choices.</span></span></label>
    <fieldset className="space-y-4"><legend className="font-display text-2xl">Categories</legend>{options.map((option) => <label key={option.name} className="flex items-start gap-3"><input type="checkbox" name={option.name} defaultChecked={preferences[option.name]} className="mt-1 size-5 accent-[var(--primary)]" /><span><strong className="block text-sm">{option.label}</strong><span className="mt-0.5 block text-sm leading-6 text-muted-foreground">{option.copy}</span></span></label>)}</fieldset>
    {state.message ? <div className={`status-message ${state.status === "success" ? "status-success" : "status-error"}`} role="status">{state.status === "success" ? <CircleCheck className="size-5 shrink-0" /> : <CircleAlert className="size-5 shrink-0" />}{state.message}</div> : null}
    <SubmitButton>Save preferences</SubmitButton>
  </form>;
}
