import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, keysetFilter, keysetFilterAfter } from "./cursor";

const id = "82000000-0000-4000-8000-000000000001";

describe("keyset cursors", () => {
  it("round-trips a PostgREST timestamp with a +00:00 offset", () => {
    const time = "2026-09-17T01:38:07.123456+00:00";
    expect(decodeCursor(encodeCursor(time, id))).toEqual({ time, id });
  });
  it("round-trips a timestamp with no fractional seconds", () => {
    const time = "2026-09-17T01:38:07+00:00";
    expect(decodeCursor(encodeCursor(time, id))).toEqual({ time, id });
  });
  it("accepts a Z suffix", () => {
    const time = "2026-09-17T01:38:07.5Z";
    expect(decodeCursor(encodeCursor(time, id))).toEqual({ time, id });
  });
  it("returns null for nothing, garbage and oversize input", () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("not base64url!!")).toBeNull();
    expect(decodeCursor("a".repeat(201))).toBeNull();
  });
  it("rejects a cursor without exactly one separator", () => {
    expect(decodeCursor(Buffer.from("2026-09-17T01:38:07+00:00").toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from("2026-09-17T01:38:07+00:00|" + id + "|extra").toString("base64url"))).toBeNull();
  });
  it("rejects a malformed id or an impossible date", () => {
    expect(decodeCursor(encodeCursor("2026-09-17T01:38:07+00:00", "not-a-uuid"))).toBeNull();
    expect(decodeCursor(encodeCursor("2026-13-01T00:00:00+00:00", id))).toBeNull();
    expect(decodeCursor(encodeCursor("yesterday", id))).toBeNull();
  });
  it("never lets a filter fragment through the id half", () => {
    expect(decodeCursor(encodeCursor("2026-09-17T01:38:07+00:00", id + ",or(id.gt.0)"))).toBeNull();
  });
  it("builds the older-than and newer-than filters", () => {
    const cursor = { time: "2026-09-17T01:38:07+00:00", id };
    expect(keysetFilter("sent_at", cursor)).toBe(`sent_at.lt.${cursor.time},and(sent_at.eq.${cursor.time},id.lt.${id})`);
    expect(keysetFilterAfter("sent_at", cursor)).toBe(`sent_at.gt.${cursor.time},and(sent_at.eq.${cursor.time},id.gt.${id})`);
  });
});
