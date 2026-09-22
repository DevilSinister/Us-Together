"use client";
import { createContext, useContext } from "react";
import type { ResolvedIdentity } from "@/lib/avatar/resolve";

export type Identities = { me: ResolvedIdentity; partner: ResolvedIdentity };

const FALLBACK: Identities = {
  me: { name: "You", src: null, style: "rose" },
  partner: { name: "Your partner", src: null, style: "rose" },
};

const IdentitiesContext = createContext<Identities>(FALLBACK);

/**
 * Who the two people are, for client components that cannot query.
 *
 * Resolved once per request in the protected layout, which is already
 * force-dynamic. The alternative was prop-drilling a pair of identities through
 * the gallery workspace and the media viewer to reach one comment thread.
 */
export function IdentitiesProvider({ value, children }: { value: Identities; children: React.ReactNode }) {
  return <IdentitiesContext.Provider value={value}>{children}</IdentitiesContext.Provider>;
}

export function useIdentities() {
  return useContext(IdentitiesContext);
}
