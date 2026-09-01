import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseConfig, requireSupabaseConfig } from "@/lib/supabase/config";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
});

describe("Supabase configuration", () => {
  it("returns null when configuration is absent", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(getSupabaseConfig()).toBeNull();
  });

  it("accepts a local development URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key-that-is-long-enough";
    expect(requireSupabaseConfig().url).toBe("http://127.0.0.1:54321");
  });

  it("accepts localhost for local development", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key-that-is-long-enough";
    expect(requireSupabaseConfig().url).toBe("http://localhost:54321");
  });

  it("rejects an insecure remote URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://example.com";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key-that-is-long-enough";
    expect(getSupabaseConfig()).toBeNull();
  });
});
