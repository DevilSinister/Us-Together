import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // /.well-known is excluded so Digital Asset Links verification never touches the session,
  // and /api/version so an open tab's update poll never refreshes one.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|\\.well-known/|api/version$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
