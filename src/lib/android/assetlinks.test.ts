import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ANDROID_APP_REFERRER, ANDROID_PACKAGE } from "./package";

/**
 * Digital Asset Links is what lets the Android shell open the site without a URL bar.
 * A typo here fails silently on the phone, so the file is asserted against the one
 * package constant the rest of the code uses.
 */
type Statement = {
  relation: string[];
  target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
};

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

describe("assetlinks.json", () => {
  const file = path.resolve(process.cwd(), "public/.well-known/assetlinks.json");
  const statements = JSON.parse(readFileSync(file, "utf8")) as Statement[];

  it("declares exactly one android_app statement for our package", () => {
    expect(statements).toHaveLength(1);
    const [statement] = statements;
    expect(statement.relation).toContain("delegate_permission/common.handle_all_urls");
    expect(statement.target.namespace).toBe("android_app");
    expect(statement.target.package_name).toBe(ANDROID_PACKAGE);
  });
  it("lists only well-formed SHA-256 fingerprints", () => {
    for (const fingerprint of statements[0].target.sha256_cert_fingerprints) {
      expect(fingerprint).toMatch(FINGERPRINT);
    }
  });
  it("rejects a placeholder fingerprint shape", () => {
    expect("AA:BB:...owner's release cert...").not.toMatch(FINGERPRINT);
    expect("AA:".repeat(31) + "AA").toMatch(FINGERPRINT);
  });
  it("derives the TWA referrer from the same package", () => {
    expect(ANDROID_APP_REFERRER).toBe("android-app://" + ANDROID_PACKAGE);
  });
});
