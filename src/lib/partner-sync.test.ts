import { afterEach, describe, expect, it, vi } from "vitest";
import { PARTNER_REFRESH_MS, refreshWindow, startPartnerRefresh } from "./partner-sync";

afterEach(() => vi.useRealTimers());
describe("partner refresh", () => {
  it("polls visible online pages and catches up on reconnect, visibility and focus", async () => {
    vi.useFakeTimers();
    const events = new EventTarget(), visibility = new EventTarget(), refresh = vi.fn();
    let allowed = false;
    const stop = startPartnerRefresh(refresh, () => allowed, events, visibility);
    await vi.advanceTimersByTimeAsync(PARTNER_REFRESH_MS * 2);
    expect(refresh).not.toHaveBeenCalled();
    allowed = true;
    for (const [target, name] of [[events,"online"], [events,"focus"], [visibility,"visibilitychange"]] as const) {
      target.dispatchEvent(new Event(name));
      await Promise.resolve();
    }
    expect(refresh).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(PARTNER_REFRESH_MS);
    expect(refresh).toHaveBeenCalledTimes(4);
    stop();
    events.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(PARTNER_REFRESH_MS);
    expect(refresh).toHaveBeenCalledTimes(4);
  });
  it("does not overlap slow requests and retries a failed refresh", async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    const refresh = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { finish=resolve; })).mockRejectedValueOnce(new Error("Offline")).mockResolvedValue(undefined);
    const events = new EventTarget();
    const stop = startPartnerRefresh(refresh, () => true, events, new EventTarget());
    events.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(PARTNER_REFRESH_MS * 3);
    expect(refresh).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(PARTNER_REFRESH_MS * 2);
    expect(refresh).toHaveBeenCalledTimes(3);
    stop();
  });
  it("rebuilds the already loaded window including deletions, without loading the entire collection", async () => {
    const load = vi.fn(async (cursor: number | null) => cursor === null
      ? {items:["new", "updated"],next:2}
      : {items:["retained"],next:3});
    expect(await refreshWindow(load, 3)).toEqual({items:["new","updated","retained"],next:3});
    expect(load.mock.calls).toEqual([[null],[2]]);
  });
  it("stops at the end when records were deleted", async () => {
    const load = vi.fn(async () => ({items:[],next:null}));
    expect(await refreshWindow(load, 24)).toEqual({items:[],next:null});
    expect(load).toHaveBeenCalledTimes(1);
  });
});
