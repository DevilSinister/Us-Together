"use server";

import { redirect } from "next/navigation";
import { startDeveloperSession } from "@/lib/auth/dev-session";

export async function developerLoginAction() {
  await startDeveloperSession();
  redirect("/onboarding");
}
