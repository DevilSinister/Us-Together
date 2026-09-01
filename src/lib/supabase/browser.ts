"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "@/lib/supabase/config";

export function createBrowserSupabaseClient() {
  const config = requireSupabaseConfig();
  return createBrowserClient(config.url, config.publishableKey);
}
