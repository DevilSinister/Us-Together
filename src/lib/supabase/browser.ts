"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export function createBrowserSupabaseClient() {
  const config = requireSupabaseConfig();
  return createBrowserClient<Database>(config.url, config.publishableKey);
}
