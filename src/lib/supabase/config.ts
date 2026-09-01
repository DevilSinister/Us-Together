import { z } from "zod";

const supabaseConfigSchema = z.object({
  url: z.url().refine((value) => value.startsWith("https://") || value.startsWith("http://127.0.0.1") || value.startsWith("http://localhost"), {
    message: "Supabase URL must use HTTPS outside local development.",
  }),
  publishableKey: z.string().min(20),
});

export type SupabaseConfig = z.infer<typeof supabaseConfigSchema>;

export function getSupabaseConfig(): SupabaseConfig | null {
  const result = supabaseConfigSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  return result.success ? result.data : null;
}

export function requireSupabaseConfig(): SupabaseConfig {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and provide the project URL and publishable key.",
    );
  }

  return config;
}
