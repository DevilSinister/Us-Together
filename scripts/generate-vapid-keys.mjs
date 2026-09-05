// Generates a VAPID application server keypair for Web Push.
//
// Nothing is written to disk: the keys are printed once so the operator can place
// them, because a committed private key would let anyone push to every subscribed
// device. Rotating the pair invalidates every existing subscription, so generate it
// once per environment and keep it.
//
//   npm run vapid

import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const jwk = privateKey.export({ format: "jwk" });
const pub = publicKey.export({ format: "jwk" });

// A VAPID public key is the uncompressed P-256 point: 0x04 || x || y, base64url.
const point = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(pub.x, "base64url"),
  Buffer.from(pub.y, "base64url"),
]).toString("base64url");

console.log(`
Add to .env.local and to the Vercel environment (browser-safe, it identifies the
sender and grants nothing on its own):

  NEXT_PUBLIC_VAPID_PUBLIC_KEY=${point}

Set as Supabase Edge Function secrets — never commit these:

  VAPID_PUBLIC_KEY=${point}
  VAPID_PRIVATE_KEY=${jwk.d}
  VAPID_SUBJECT=mailto:you@example.com

Then follow docs/PHASE8_OPERATIONS.md to store the dispatcher's Vault secrets.
`);
