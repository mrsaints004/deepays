import { createServerClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types/database";

export async function getSession(): Promise<User | null> {
  const supabase = await createServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .single();

  return data ?? null;
}
