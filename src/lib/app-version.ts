import { z } from "zod";

/**
 * The commit this bundle was built from. next.config inlines it at build time into
 * the client and server bundles alike, so an open tab keeps the version it loaded
 * with while /api/version reports whatever is deployed now. Empty in local
 * development, where there is no deployment to fall behind.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

const versionResponseSchema = z.object({ version: z.string().max(64) });

/** The deployed version from an /api/version body, or null when it is unusable. */
export function parseServedVersion(body: unknown): string | null {
  const parsed = versionResponseSchema.safeParse(body);
  return parsed.success && parsed.data.version ? parsed.data.version : null;
}

/**
 * A tab is behind only when both sides know their version and they differ. An
 * unconfigured build on either side never prompts, so a missing variable cannot
 * turn into a reload loop.
 */
export function isBehindDeployment(loaded: string, served: string | null): boolean {
  return Boolean(loaded) && Boolean(served) && loaded !== served;
}
