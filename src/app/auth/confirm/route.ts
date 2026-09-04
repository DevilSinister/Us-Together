import { type EmailOtpType } from "@supabase/supabase-js";
import { endDeveloperSession } from "@/lib/auth/dev-session";
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/home";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await createServerSupabaseClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing confirmation token.") };

  if (result.error) {
    const errorUrl = new URL("/sign-in", url.origin);
    errorUrl.searchParams.set("error", "That confirmation link is invalid or expired.");
    return NextResponse.redirect(errorUrl);
  }

  await endDeveloperSession();
  return NextResponse.redirect(new URL(next, url.origin));
}
