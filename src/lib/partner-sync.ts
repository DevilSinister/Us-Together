export const PARTNER_REFRESH_MS = 5_000;

/** Serial refreshes; offline/background tabs catch up on return. */
export function startPartnerRefresh(refresh: () => Promise<void> | void, canRefresh: () => boolean, events: EventTarget, visibility: EventTarget) {
  let active = true, running = false;
  const run = async () => {
    if (!active || running || !canRefresh()) return;
    running = true;
    try { await refresh(); } catch { /* Keep the last good view and retry. */ }
    finally { running = false; }
  };
  const wake = () => { void run(); };
  const timer = setInterval(wake, PARTNER_REFRESH_MS);
  events.addEventListener("focus", wake);
  events.addEventListener("online", wake);
  visibility.addEventListener("visibilitychange", wake);
  return () => {
    active = false;
    clearInterval(timer);
    events.removeEventListener("focus", wake);
    events.removeEventListener("online", wake);
    visibility.removeEventListener("visibilitychange", wake);
  };
}

/** Re-read only the window already opened, retaining keyset pagination. */
export async function refreshWindow<T, C>(load: (cursor: C | null) => Promise<{ items: T[]; next: C | null }>, minimum: number) {
  const items: T[] = [];
  let next: C | null = null;
  do {
    const page = await load(next);
    items.push(...page.items);
    next = page.next;
  } while (next !== null && items.length < minimum);
  return { items, next };
}
