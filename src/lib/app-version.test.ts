import { describe, expect, it } from "vitest";
import { isBehindDeployment, parseServedVersion } from "@/lib/app-version";

describe("parseServedVersion", () => {
  it("reads the deployed version", () => {
    expect(parseServedVersion({ version: "abc123" })).toBe("abc123");
  });

  it("rejects bodies that are not a version response", () => {
    expect(parseServedVersion(null)).toBeNull();
    expect(parseServedVersion({})).toBeNull();
    expect(parseServedVersion({ version: 42 })).toBeNull();
    expect(parseServedVersion({ version: "" })).toBeNull();
    expect(parseServedVersion({ version: "x".repeat(65) })).toBeNull();
  });
});

describe("isBehindDeployment", () => {
  it("is behind when the deployed commit differs from the loaded one", () => {
    expect(isBehindDeployment("old", "new")).toBe(true);
  });

  it("is current when both match", () => {
    expect(isBehindDeployment("same", "same")).toBe(false);
  });

  it("never prompts when either side is unconfigured", () => {
    expect(isBehindDeployment("", "new")).toBe(false);
    expect(isBehindDeployment("old", null)).toBe(false);
    expect(isBehindDeployment("", null)).toBe(false);
  });
});
