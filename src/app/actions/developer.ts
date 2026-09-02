"use server";

import { redirect } from "next/navigation";
import { startDeveloperSession } from "@/lib/auth/dev-session";

export async function developerLoginAction(formData: FormData) {
  const fixture = formData.get("fixture") === "solo" ? "solo" : "paired";
  await startDeveloperSession(fixture);
  redirect(fixture === "paired" ? "/home" : "/onboarding");
}
