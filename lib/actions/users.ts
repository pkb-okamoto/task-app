"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { type User } from "@/lib/types";

// ============================================================
// ユーザー一覧取得（担当者選択UIで使用）
// ============================================================
export async function getUsers(): Promise<User[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, name, avatar_url, color")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ============================================================
// ユーザーのメールアドレス一覧取得（adminクライアント使用）
// ============================================================
export async function getUserEmails(): Promise<Record<string, string>> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return {};

  return Object.fromEntries(
    (data.users ?? []).map((u) => [u.id, u.email ?? ""])
  );
}
