"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// メンバーを招待（仮パスワード方式）
export async function inviteMember(
  workspaceId: string,
  email: string,
  name?: string
): Promise<{ error?: string; tempPassword?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "未ログイン" };

  const admin = getAdminClient();

  // 仮パスワードを生成（英数字8文字）
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const tempPassword = Array.from({ length: 10 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");

  // ユーザーをメール確認済みで作成
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name, workspace_id: workspaceId },
  });

  if (error) return { error: error.message };

  const userId = data.user.id;

  // usersテーブルに登録
  const { error: userError } = await admin.from("users").upsert({
    id: userId,
    name: name ?? email.split("@")[0],
    avatar_url: null,
  });
  if (userError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "ユーザー登録に失敗しました。もう一度お試しください。" };
  }

  // workspace_membersに追加
  const { error: memberError } = await admin.from("workspace_members").upsert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "member",
  });
  if (memberError) {
    await admin.from("users").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return { error: "ワークスペースへの追加に失敗しました。もう一度お試しください。" };
  }

  return { tempPassword };
}
