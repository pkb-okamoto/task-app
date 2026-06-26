"use server";

import { createClient } from "@/lib/supabase/server";
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
