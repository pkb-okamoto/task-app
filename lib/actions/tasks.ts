"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type GroupStatus, type Priority, type Task } from "@/lib/types";

// ============================================================
// タスク一覧取得（担当者・サブタスク込み）
// ============================================================
export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      assignees:task_assignees(
        user:users(id, name, avatar_url)
      )
    `)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  // フラットなリストをツリー構造（親→サブタスク）に変換
  return buildTaskTree(data ?? []);
}

// フラットなタスク配列をツリー構造に変換するヘルパー
function buildTaskTree(rows: RawTask[]): Task[] {
  const map = new Map<string, Task>();

  // まず全タスクをMapに登録
  rows.forEach((row) => {
    map.set(row.id, {
      ...row,
      assignees: row.assignees?.map((a: { user: { id: string; name: string; avatar_url: string | null } }) => a.user) ?? [],
      subtasks: [],
    });
  });

  const roots: Task[] = [];

  // 親子関係を構築
  map.forEach((task) => {
    if (task.parent_task_id) {
      const parent = map.get(task.parent_task_id);
      parent?.subtasks?.push(task);
    } else {
      roots.push(task);
    }
  });

  return roots;
}

// Supabaseから返る生データの型
type RawTask = Omit<Task, "assignees" | "subtasks"> & {
  assignees: { user: { id: string; name: string; avatar_url: string | null } }[];
};

// ============================================================
// タスク作成
// ============================================================
export async function createTask(input: {
  title: string;
  group_status: GroupStatus;
  due_date?: string | null;
  progress?: number;
  notes?: string | null;
  priority?: Priority;
  parent_task_id?: string | null;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").insert({
    title: input.title,
    group_status: input.group_status,
    due_date: input.due_date ?? null,
    progress: input.progress ?? 0,
    notes: input.notes ?? null,
    priority: input.priority ?? "中",
    parent_task_id: input.parent_task_id ?? null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ============================================================
// タスク更新
// ============================================================
export async function updateTask(
  taskId: string,
  input: Partial<{
    title: string;
    group_status: GroupStatus;
    due_date: string | null;
    progress: number;
    notes: string | null;
    priority: Priority;
  }>
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update(input)
    .eq("id", taskId);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ============================================================
// タスク削除（サブタスクは ON DELETE CASCADE で自動削除）
// ============================================================
export async function deleteTask(taskId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ============================================================
// 担当者の設定（既存を全削除→再挿入）
// ============================================================
export async function setTaskAssignees(taskId: string, userIds: string[]) {
  const supabase = await createClient();

  // 既存の担当者を削除
  const { error: deleteError } = await supabase
    .from("task_assignees")
    .delete()
    .eq("task_id", taskId);

  if (deleteError) throw new Error(deleteError.message);

  // 新しい担当者を挿入（空なら終了）
  if (userIds.length === 0) {
    revalidatePath("/");
    return;
  }

  const { error: insertError } = await supabase.from("task_assignees").insert(
    userIds.map((userId) => ({ task_id: taskId, user_id: userId }))
  );

  if (insertError) throw new Error(insertError.message);
  revalidatePath("/");
}
