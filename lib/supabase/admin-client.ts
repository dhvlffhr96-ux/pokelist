import { createClient } from "@supabase/supabase-js";
import { getAppEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const env = getAppEnv();

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase 환경변수가 비어 있습니다.");
  }

  adminClient = createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}
