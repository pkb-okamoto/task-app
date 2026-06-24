"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// サインアップ
// ============================================================
export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }, // auth.usersのraw_user_meta_dataに保存→トリガーでusersテーブルへ
    },
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/");
}

// ============================================================
// ログイン
// ============================================================
export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/");
}

// ============================================================
// ログアウト
// ============================================================
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

// ============================================================
// 現在のログインユーザー取得
// ============================================================
export async function getCurrentUser() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .eq("id", user.id)
    .single();

  return data ?? null;
}
