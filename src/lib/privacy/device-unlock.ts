"use client";

const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (character) => character.charCodeAt(0));
const random = (length: number) => crypto.getRandomValues(new Uint8Array(length));
const bytes = (value: Uint8Array) => Uint8Array.from(value).buffer;
const storageKey = (userId: string) => `us-together-device-lock:${userId}`;
type Stored = { id: string; salt: string; iv: string; cipher: string };
type PrfResult = AuthenticationExtensionsClientOutputs & { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } };

export function hasDeviceUnlock(userId: string) {
  return typeof window !== "undefined" && !!window.PublicKeyCredential && !!localStorage.getItem(storageKey(userId));
}

async function derivedKey(credential: PublicKeyCredential) {
  const output = (credential.getClientExtensionResults() as PrfResult).prf?.results?.first;
  if (!output) throw new Error("Device unlock is not supported here. Use your code instead.");
  return crypto.subtle.importKey("raw", output, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function enrollDeviceUnlock(userId: string, code: string) {
  if (!window.PublicKeyCredential || !navigator.credentials) throw new Error("Device unlock is unavailable in this browser.");
  const salt = random(32);
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: bytes(random(32)), rp: { name: "Us Together" },
    user: { id: bytes(new TextEncoder().encode(userId)), name: userId, displayName: "Us Together" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
    timeout: 60000,
    extensions: { prf: { eval: { first: bytes(salt) } } },
  };
  const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;
  if (!credential) throw new Error("Device unlock setup was cancelled.");
  const id = encode(new Uint8Array(credential.rawId));
  // Some authenticators only evaluate PRF during an assertion after creation.
  const key = (credential.getClientExtensionResults() as PrfResult).prf?.results?.first
    ? await derivedKey(credential)
    : await credentialKey(id, salt);
  const iv = random(12);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: bytes(iv) }, key, new TextEncoder().encode(code));
  const stored: Stored = { id, salt: encode(salt), iv: encode(iv), cipher: encode(new Uint8Array(cipher)) };
  localStorage.setItem(storageKey(userId), JSON.stringify(stored));
}

async function credentialKey(id: string, salt: Uint8Array) {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: bytes(random(32)), allowCredentials: [{ type: "public-key", id: bytes(decode(id)) }],
    userVerification: "required", timeout: 60000,
    extensions: { prf: { evalByCredential: { [id]: { first: bytes(salt) } } } },
  };
  const credential = await navigator.credentials.get({ publicKey }) as PublicKeyCredential | null;
  if (!credential) throw new Error("Device unlock was cancelled.");
  return derivedKey(credential);
}

export async function codeFromDevice(userId: string) {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) throw new Error("Set up device unlock in Privacy locks first.");
  const stored = JSON.parse(raw) as Stored;
  const key = await credentialKey(stored.id, decode(stored.salt));
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(decode(stored.iv)) }, key, bytes(decode(stored.cipher)));
    return new TextDecoder().decode(plain);
  } catch { throw new Error("Device unlock needs to be set up again. Use your code."); }
}

export function removeDeviceUnlock(userId: string) {
  localStorage.removeItem(storageKey(userId));
}
