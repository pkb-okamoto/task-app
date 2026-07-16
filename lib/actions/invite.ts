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

// メール招待を送信してworkspace_membersに追加
export async function inviteMember(
  workspaceId: string,
  email: string,
  name?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "未ログイン" };

  const admin = getAdminClient();

  // 招待メール送信（Supabase Auth）
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://task-app-sooty-one.vercel.app"}/invite/accept`,
    data: { name, workspace_id: workspaceId },
  });

  if (error) return { error: error.message };

  const userId = data.user.id;

  // usersテーブルに仮登録（名前はログイン時に上書きされる）
  const { error: userError } = await admin.from("users").upsert({
    id: userId,
    name: name ?? email.split("@")[0],
    avatar_url: null,
  });
  if (userError) {
    // ロールバック：auth.usersから削除して宙ぶらりを防ぐ
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
    // ロールバック：usersテーブルとauth.usersを削除
    await admin.from("users").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return { error: "ワークスペースへの追加に失敗しました。もう一度お試しください。" };
  }

  return {};
}
