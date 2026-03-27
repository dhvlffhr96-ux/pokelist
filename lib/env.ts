import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().optional(),
  APP_SESSION_SECRET: z.string().trim().optional(),
  SUPABASE_USER_COLLECTION_BUCKET: z
    .string()
    .trim()
    .min(1)
    .default("user-collections"),
});

let cachedEnv: ReturnType<typeof buildEnv> | null = null;

function buildEnv() {
  const parsed = envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_SESSION_SECRET: process.env.APP_SESSION_SECRET,
    SUPABASE_USER_COLLECTION_BUCKET: process.env.SUPABASE_USER_COLLECTION_BUCKET,
  });

  return {
    supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL || null,
    supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY || null,
    sessionSecret: parsed.APP_SESSION_SECRET || null,
    userCollectionBucket: parsed.SUPABASE_USER_COLLECTION_BUCKET,
  };
}

export function getAppEnv() {
  if (!cachedEnv) {
    cachedEnv = buildEnv();
  }

  return cachedEnv;
}
