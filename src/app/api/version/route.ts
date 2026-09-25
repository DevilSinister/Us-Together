import { APP_VERSION } from "@/lib/app-version";

/**
 * The deployed commit, for open tabs to compare against the one they loaded. It is
 * public on purpose: the same value already ships in every client bundle, and the
 * update prompt has to work on signed-out pages too. The proxy matcher skips this
 * path so a poll never refreshes a session.
 */
export function GET() {
  return Response.json({ version: APP_VERSION }, { headers: { "Cache-Control": "no-store" } });
}
