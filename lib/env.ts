import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().optional(),
  USER_LIST_STORAGE_DIR: z.string().trim().min(1).default("data/user-lists"),
});

let cachedEnv: ReturnType<typeof buildEnv> | null = null;

function buildEnv() {
  const parsed = envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    USER_LIST_STORAGE_DIR: process.env.USER_LIST_STORAGE_DIR,
  });

  return {
    supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL || null,
    supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY || null,
    userListStorageDir: parsed.USER_LIST_STORAGE_DIR,
  };
}

export function getAppEnv() {
  if (!cachedEnv) {
    cachedEnv = buildEnv();
  }

  return cachedEnv;
}
