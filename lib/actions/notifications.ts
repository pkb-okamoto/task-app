"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { type User } from "@/lib/types";

export interface Notification {
  id: string;
  user_id: string;
  task_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return data ?? [];
}

export async function markAllAsRead(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/");
}

export async function markAsRead(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/");
}

// 備考フィールドから @名前 を抽出し、通知を作成する（1時間以内の重複は除外）
export async function createMentionNotifications({
  taskId,
  taskTitle,
  newNotes,
  allUsers,
  mentionedByUserId,
}: {
  taskId: string;
  taskTitle: string;
  newNotes: string;
  prevNotes?: string;
  allUsers: User[];
  mentionedByUserId: string;
}): Promise<void> {
  const supabase = await createClient();

  const extractMentions = (text: string): string[] => {
    // 半角@・全角＠どちらも対応
    const matches = text.match(/[@＠]([^\s@＠]+)/g) ?? [];
    return matches.map((m) => m.slice(1));
  };

  const names = extractMentions(newNotes);
  if (names.length === 0) return;

  const targets = names.flatMap((name) =>
    allUsers.filter((u) => u.name === name)
  );

  if (targets.length === 0) return;

  // 1時間以内に同じタスク×ユーザーの未読通知があればスキップ
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("notifications")
    .select("user_id")
    .eq("task_id", taskId)
    .eq("is_read", false)
    .gte("created_at", oneHourAgo);

  const recentUserIds = new Set((recent ?? []).map((r: { user_id: string }) => r.user_id));

  const toInsert = targets
    .filter((u) => !recentUserIds.has(u.id))
    .map((u) => ({
      user_id: u.id,
      task_id: taskId,
      message: `タスク「${taskTitle}」の備考であなたがメンションされました`,
      is_read: false,
    }));

  if (toInsert.length === 0) return;

  const { error } = await supabase.from("notifications").insert(toInsert);
  if (error) console.error("[通知] insert失敗:", error.message);
}
