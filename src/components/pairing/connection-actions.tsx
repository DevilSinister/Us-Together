"use client";

import { useActionState, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        <h2 className="font-display text-section-title">Invitation controls</h2>
        <p className="mt-2 leading-7 text-muted-foreground">Create a fresh short-lived code or revoke the current one. Creating a code automatically retires the previous code.</p>
        <form action={createAction} className="mt-4"><SubmitButton>Create fresh invitation</SubmitButton></form>
        <Message state={createState} />
        <form action={revokeAction} className="mt-4"><SubmitButton>Revoke invitation</SubmitButton></form>
        <Message state={revokeState} />
      </section>
      <section className="border-t pt-8">
        <h2 className="font-display text-section-title">Delete this empty space</h2>
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

/**
 * Leaving the shared space: a danger outline button that opens a dialog with
 * the same typed confirmation as before (LEAVE), because leaving is not undone
 * by a tap. Nothing changes until the form inside is submitted.
 */
export function LeaveSpace() {
  const [state, action] = useActionState(leaveCoupleAction, initialActionState);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="danger" className="w-full" onClick={() => setOpen(true)}>Leave this space</Button>
      <p className="text-center text-[0.8125rem] leading-5 text-muted-foreground">You&rsquo;ll be asked to confirm before anything changes.</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Leave this shared space?" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave this shared space?</DialogTitle>
            <DialogDescription>You immediately lose access. Shared plans and memories stay with your partner.</DialogDescription>
          </DialogHeader>
          <form action={action} className="mt-5 space-y-4">
            <div className="space-y-2"><Label htmlFor="leave-confirmation">Type LEAVE to confirm</Label><Input id="leave-confirmation" name="confirmation" autoComplete="off" required autoFocus /></div>
            <SubmitButton>Leave shared space</SubmitButton>
          </form>
          <Message state={state} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
