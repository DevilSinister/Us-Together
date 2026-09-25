import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/current-user", () => ({ getCurrentIdentity: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));

const { partnerName } = await import("./context");

/** A fake query builder answering each table with one fixed row. */
function database(rows: Record<string, unknown>) {
  const read: string[] = [];
  return {
    read,
    db: {
      from(table: string) {
        read.push(table);
        const query: Record<string, unknown> = {};
        for (const method of ["select", "eq", "is", "neq"]) query[method] = () => query;
        query.maybeSingle = async () => ({ data: rows[table] ?? null, error: null });
        return query;
      },
    },
  };
}

const context = (db: unknown, coupleId: string | null = "couple-1") =>
  ({ kind: "database", db, userId: "me", coupleId }) as unknown as Parameters<typeof partnerName>[0];

describe("the partner's name on every label", () => {
  it("is the name I chose in Settings, not the one they signed up with", async () => {
    const { db } = database({
      couple_memberships: { user_id: "them" },
      partner_presentations: { display_name: "  Mo  " },
      profiles: { display_name: "Mohammed" },
    });
    expect(await partnerName(context(db))).toBe("Mo");
  });

  it("falls back to their own name when I chose none", async () => {
    const { db, read } = database({
      couple_memberships: { user_id: "them" },
      partner_presentations: { display_name: "   " },
      profiles: { display_name: "Mohammed" },
    });
    expect(await partnerName(context(db))).toBe("Mohammed");
    expect(read).toContain("profiles");
  });

  it("is nothing while unpaired, or before the partner has joined", async () => {
    expect(await partnerName(context(database({}).db, null))).toBeNull();
    const { db } = database({ partner_presentations: { display_name: "Mo" } });
    expect(await partnerName(context(db))).toBeNull();
  });
});
