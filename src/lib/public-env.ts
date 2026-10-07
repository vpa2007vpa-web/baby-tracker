import { z } from "zod";

// Client-safe variables only. Server-only variables live in `@/lib/env`.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("sb_publishable_", {
      error: "Use the publishable key (sb_publishable_…), never a secret key",
    }),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

// Next.js only inlines NEXT_PUBLIC_* variables that are referenced literally,
// so they cannot be read through a generic `process.env` lookup.
export const publicEnv: PublicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
