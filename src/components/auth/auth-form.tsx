"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import type { ActionState } from "@/lib/auth/types";
import { initialActionState } from "@/lib/auth/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

type AuthAction = (previous: ActionState, formData: FormData) => Promise<ActionState>;

type AuthFormProps = {
  action: AuthAction;
  mode: "sign-in" | "sign-up" | "forgot-password" | "reset-password";
};

export function AuthForm({ action, mode }: AuthFormProps) {
  const [state, formAction] = useActionState(action, initialActionState);
  const isSignUp = mode === "sign-up";
  const isForgot = mode === "forgot-password";
  const isReset = mode === "reset-password";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {!isReset ? <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={Boolean(state.fields?.email)} aria-describedby={state.fields?.email ? "email-error" : undefined} placeholder="you@example.com" />
        {state.fields?.email ? <p id="email-error" className="field-error">{state.fields.email[0]}</p> : null}
      </div> : null}

      {!isForgot ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <Label htmlFor="password">Password</Label>
            {mode === "sign-in" ? <Link href="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link> : null}
          </div>
          <Input id="password" name="password" type="password" autoComplete={isSignUp || isReset ? "new-password" : "current-password"} required aria-invalid={Boolean(state.fields?.password)} aria-describedby={state.fields?.password ? "password-error" : isSignUp || isReset ? "password-help" : undefined} />
          {isSignUp || isReset ? <p id="password-help" className="text-xs leading-5 text-muted-foreground">At least 10 characters with upper- and lowercase letters and a number.</p> : null}
          {state.fields?.password ? <p id="password-error" className="field-error">{state.fields.password[0]}</p> : null}
        </div>
      ) : null}

      {isSignUp || isReset ? (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required aria-invalid={Boolean(state.fields?.confirmPassword)} aria-describedby={state.fields?.confirmPassword ? "confirm-error" : undefined} />
          {state.fields?.confirmPassword ? <p id="confirm-error" className="field-error">{state.fields.confirmPassword[0]}</p> : null}
        </div>
      ) : null}

      {state.message ? (
        <div className={state.status === "success" ? "status-message status-success" : "status-message status-error"} role={state.status === "error" ? "alert" : "status"}>
          {state.status === "success" ? <CircleCheck className="size-5 shrink-0" aria-hidden="true" /> : <CircleAlert className="size-5 shrink-0" aria-hidden="true" />}
          <span>{state.message}</span>
        </div>
      ) : null}

      <SubmitButton>{isForgot ? "Send recovery email" : isSignUp ? "Create account" : isReset ? "Update password" : "Sign in"}</SubmitButton>
    </form>
  );
}
