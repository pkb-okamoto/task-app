"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { type User } from "@/lib/types";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const admin = getAdmin();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return {};
  return Object.fromEntries(
    (data.users ?? []).map((u) => [u.id, u.email ?? ""])
  );
}

// ============================================================
// ユーザーをアプリから完全削除（自分自身は不可）
// ============================================================
export async function deleteUser(targetUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "未ログイン" };
  if (user.id === targetUserId) return { error: "自分自身は削除できません" };

  const admin = getAdmin();

  // auth.usersから先に削除（CASCADEでworkspace_membersも自動削除）
  const { error: authError } = await admin.auth.admin.deleteUser(targetUserId);
  if (authError) return { error: authError.message };

  // usersテーブルを削除（CASCADE未設定の場合の保険）
  await admin.from("users").delete().eq("id", targetUserId);

  revalidatePath("/");
  return {};
}
