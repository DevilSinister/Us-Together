"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import {
  deleteEmptyCoupleAction,
  createCoupleAction,
  leaveCoupleAction,
  revokePairingInviteAction,
} from "@/app/actions/onboarding";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState, type ActionState } from "@/lib/auth/types";

function Message({ state }: { state: ActionState }) {
  if (!state.message) return null;
  const Icon = state.status === "success" ? CircleCheck : CircleAlert;
  return <p className={`status-message ${state.status === "success" ? "status-success" : "status-error"}`} role={state.status === "error" ? "alert" : "status"}><Icon className="size-5 shrink-0" aria-hidden="true" />{state.message}</p>;
}

export function WaitingConnectionActions() {
  const [createState, createAction] = useActionState(createCoupleAction, initialActionState);
  const [revokeState, revokeAction] = useActionState(revokePairingInviteAction, initialActionState);
  const [deleteState, deleteAction] = useActionState(deleteEmptyCoupleAction, initialActionState);
  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-2xl">Invitation controls</h2>
        <p className="mt-2 leading-7 text-muted-foreground">Create a fresh short-lived code or revoke the current one. Creating a code automatically retires the previous code.</p>
        <form action={createAction} className="mt-4"><SubmitButton>Create fresh invitation</SubmitButton></form>
        <Message state={createState} />
        <form action={revokeAction} className="mt-4"><SubmitButton>Revoke invitation</SubmitButton></form>
        <Message state={revokeState} />
      </section>
      <section className="border-t pt-8">
        <h2 className="font-display text-2xl">Delete this empty space</h2>
        <p className="mt-2 leading-7 text-muted-foreground">This is only available before a partner joins and before shared plans or memories exist.</p>
        <form action={deleteAction} className="mt-4 space-y-4">
          <div className="space-y-2"><Label htmlFor="delete-confirmation">Type DELETE to confirm</Label><Input id="delete-confirmation" name="confirmation" autoComplete="off" required /></div>
          <SubmitButton>Delete empty shared space</SubmitButton>
        </form>
        <Message state={deleteState} />
      </section>
    </div>
  );
}

export function PairedConnectionActions() {
  const [state, action] = useActionState(leaveCoupleAction, initialActionState);
  return (
    <section className="border-t pt-8">
      <h2 className="font-display text-2xl">Leave this shared space</h2>
      <p className="mt-2 leading-7 text-muted-foreground">You immediately lose access. Shared plans and memories stay with the remaining partner.</p>
      <form action={action} className="mt-4 space-y-4">
        <div className="space-y-2"><Label htmlFor="leave-confirmation">Type LEAVE to confirm</Label><Input id="leave-confirmation" name="confirmation" autoComplete="off" required /></div>
        <SubmitButton>Leave shared space</SubmitButton>
      </form>
      <Message state={state} />
    </section>
  );
}
