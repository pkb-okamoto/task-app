"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type Workspace, type WorkspaceMember, type User } from "@/lib/types";

// ============================================================
// 自分が参加しているワークスペース一覧を取得
// ============================================================
export async function getWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 自分がメンバーのワークスペースIDを取得
  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);

  const workspaceIds = (memberRows ?? []).map((r) => r.workspace_id);
  if (workspaceIds.length === 0) return [];

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .in("id", workspaceIds)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ============================================================
// ワークスペース作成（作成者を自動でメンバーに追加）
// ============================================================
export async function createWorkspace(name: string): Promise<Workspace> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name, created_by: user.id, is_personal: name === "マイワークスペース" })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // 作成者をメンバーとして追加
  await supabase.from("workspace_members").insert({
    workspace_id: data.id,
    user_id: user.id,
    role: "owner",
  });

  revalidatePath("/");
  return data;
}

// ============================================================
// ワークスペース名の更新
// ============================================================
export async function updateWorkspace(workspaceId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ name })
    .eq("id", workspaceId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ============================================================
// ワークスペース削除
// ============================================================
export async function deleteWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ============================================================
// ワークスペースのメンバー一覧を取得
// ============================================================
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const supabase = await createClient();

  // workspace_membersのuser_idでusersを別クエリで取得
  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, user_id, role")
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);
  if (!members || members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: users } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .in("id", userIds);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  return members.map((m) => ({
    ...m,
    user: userMap.get(m.user_id),
  })) as WorkspaceMember[];
}

// ============================================================
// メンバーをIDで追加（usersテーブルから検索）
// ============================================================
export async function addMemberToWorkspace(workspaceId: string, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "member",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ============================================================
// メンバーをワークスペースから削除
// ============================================================
export async function removeMemberFromWorkspace(workspaceId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ============================================================
// ワークスペースに紐づくユーザー一覧を取得
// ============================================================
export async function getWorkspaceUsers(workspaceId: string): Promise<User[]> {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);
  if (!members || members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: users } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .in("id", userIds);

  return (users ?? []) as User[];
}
