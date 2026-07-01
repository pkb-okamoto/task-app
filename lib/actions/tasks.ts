"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type Priority, type Task } from "@/lib/types";
import { upsertCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { createMentionNotifications } from "@/lib/actions/notifications";
import { getUsers } from "@/lib/actions/users";

// ============================================================
// タスク一覧取得（担当者・サブタスク込み）
// ============================================================
export async function getTasks(workspaceId?: string | null): Promise<Task[]> {
  const supabase = await createClient();

  let query = supabase
    .from("tasks")
    .select(`
      *,
      assignees:task_assignees(
        user:users(id, name, avatar_url)
      ),
      attachments:task_attachments(count)
    `)
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else {
    query = query.is("workspace_id", null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return buildTaskTree(data ?? []);
}

// フラットなタスク配列をツリー構造に変換するヘルパー
function buildTaskTree(rows: RawTask[]): Task[] {
  const map = new Map<string, Task>();

  rows.forEach((row) => {
    map.set(row.id, {
      ...row,
      assignees: row.assignees?.map((a: { user: { id: string; name: string; avatar_url: string | null } }) => a.user) ?? [],
      attachment_count: (row.attachments as { count: number }[] | null)?.[0]?.count ?? 0,
      subtasks: [],
    });
  });

  const roots: Task[] = [];
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

type RawTask = Omit<Task, "assignees" | "subtasks" | "attachment_count"> & {
  assignees: { user: { id: string; name: string; avatar_url: string | null } }[];
  attachments?: { count: number }[] | null;
};

// ============================================================
// タスク作成
// ============================================================
export async function createTask(input: {
  title: string;
  group_id?: string | null;
  group_status?: string;
  due_date?: string | null;
  due_time?: string | null;
  progress?: number;
  notes?: string | null;
  priority?: Priority;
  alert_days?: number | null;
  parent_task_id?: string | null;
  workspace_id?: string | null;
}) {
  const supabase = await createClient();

  const { data: newTask, error } = await supabase.from("tasks").insert({
    title: input.title,
    group_id: input.group_id ?? null,
    group_status: input.group_status ?? "未着手",
    due_date: input.due_date ?? null,
    due_time: input.due_time ?? null,
    progress: input.progress ?? 0,
    notes: input.notes ?? null,
    priority: input.priority ?? "中",
    alert_days: input.alert_days ?? null,
    parent_task_id: input.parent_task_id ?? null,
    workspace_id: input.workspace_id ?? null,
  }).select("id").single();

  if (error) throw new Error(error.message);

  const { data: { user } } = await supabase.auth.getUser();

  // 備考のメンション通知
  if (newTask && input.notes && user) {
    const allUsers = await getUsers();
    await createMentionNotifications({
      taskId: newTask.id,
      taskTitle: input.title,
      newNotes: input.notes,
      prevNotes: "",
      allUsers,
      mentionedByUserId: user.id,
    }).catch((e) => console.error("[通知] createTask mention失敗:", e?.message));
  }

  revalidatePath("/");
  return newTask?.id ?? null;
}

// ============================================================
// タスク更新
// ============================================================
export async function updateTask(
  taskId: string,
  input: Partial<{
    title: string;
    group_id: string | null;
    group_status: string;
    due_date: string | null;
    due_time: string | null;
    progress: number;
    notes: string | null;
    priority: Priority;
    alert_days: number | null;
  }>
) {
  const supabase = await createClient();

  // メンション検知のために更新前の備考を取得
  let prevNotes = "";
  if ("notes" in input) {
    const { data: prev } = await supabase.from("tasks").select("notes, title").eq("id", taskId).single();
    prevNotes = prev?.notes ?? "";
  }

  const { error } = await supabase.from("tasks").update(input).eq("id", taskId);
  if (error) throw new Error(error.message);

  const { data: { user } } = await supabase.auth.getUser();

  // 期限が変更された場合は担当者全員のGoogleカレンダーに同期
  if ("due_date" in input) {
    const { data: assigneeRows } = await supabase
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", taskId);
    const assigneeIds = (assigneeRows ?? []).map((r) => r.user_id);

    if (input.due_date) {
      const { data: task } = await supabase.from("tasks").select("id, title, notes").eq("id", taskId).single();
      if (task) {
        await Promise.all(
          assigneeIds.map((uid) =>
            upsertCalendarEvent(uid, { id: task.id, title: task.title, due_date: input.due_date!, due_time: input.due_time ?? null, notes: task.notes }).catch(() => {})
          )
        );
      }
    } else {
      await Promise.all(
        assigneeIds.map((uid) => deleteCalendarEvent(uid, taskId).catch(() => {}))
      );
    }
  }

  // 備考のメンション通知
  if ("notes" in input && input.notes && user) {
    const { data: taskData } = await supabase.from("tasks").select("title").eq("id", taskId).single();
    const allUsers = await getUsers();
    await createMentionNotifications({
      taskId,
      taskTitle: taskData?.title ?? input.title ?? "",
      newNotes: input.notes,
      prevNotes,
      allUsers,
      mentionedByUserId: user.id,
    }).catch((e) => console.error("[通知] updateTask mention失敗:", e?.message));
  }

  revalidatePath("/");
}

// ============================================================
// タスク削除
// ============================================================
export async function deleteTask(taskId: string) {
  const supabase = await createClient();

  // 担当者全員のGoogleカレンダーからイベントを削除
  const { data: assigneeRows } = await supabase
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", taskId);
  const assigneeIds = (assigneeRows ?? []).map((r) => r.user_id);
  await Promise.all(assigneeIds.map((uid) => deleteCalendarEvent(uid, taskId).catch(() => {})));

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ============================================================
// タスクのコピー
// ============================================================
export async function duplicateTask(taskId: string) {
  const supabase = await createClient();

  const { data: src, error } = await supabase
    .from("tasks")
    .select("*, task_assignees(user_id)")
    .eq("id", taskId)
    .single();

  if (error || !src) throw new Error(error?.message ?? "タスクが見つかりません");

  const { data: newTask, error: insertError } = await supabase
    .from("tasks")
    .insert({
      title: `${src.title} (コピー)`,
      group_id: src.group_id,
      group_status: src.group_status,
      progress: src.progress,
      notes: src.notes,
      priority: src.priority,
      parent_task_id: src.parent_task_id,
      workspace_id: src.workspace_id,
      due_date: null,
      due_time: null,
    })
    .select("id")
    .single();

  if (insertError || !newTask) throw new Error(insertError?.message ?? "コピー失敗");

  // 担当者もコピー
  const assignees = (src.task_assignees as { user_id: string }[]) ?? [];
  if (assignees.length > 0) {
    await supabase.from("task_assignees").insert(
      assignees.map((a) => ({ task_id: newTask.id, user_id: a.user_id }))
    );
  }

  revalidatePath("/");
}

// ============================================================
// タスクの並び順を一括更新
// ============================================================
export async function updateTaskPositions(
  updates: { id: string; position: number; group_id: string | null; group_status: string }[]
) {
  const supabase = await createClient();
  await Promise.all(
    updates.map(({ id, position, group_id, group_status }) =>
      supabase.from("tasks").update({ position, group_id, group_status }).eq("id", id)
    )
  );
  revalidatePath("/");
}

// ============================================================
// 担当者の設定
// ============================================================
export async function setTaskAssignees(taskId: string, userIds: string[]) {
  const supabase = await createClient();

  // 変更前の担当者を取得（カレンダー削除対象の特定に使用）
  const { data: prevRows } = await supabase
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", taskId);
  const prevIds = (prevRows ?? []).map((r) => r.user_id);

  const { error: deleteError } = await supabase
    .from("task_assignees")
    .delete()
    .eq("task_id", taskId);
  if (deleteError) throw new Error(deleteError.message);

  if (userIds.length > 0) {
    const { error: insertError } = await supabase.from("task_assignees").insert(
      userIds.map((userId) => ({ task_id: taskId, user_id: userId }))
    );
    if (insertError) throw new Error(insertError.message);
  }

  // タスクの期限を取得してカレンダー同期
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, due_date, due_time, notes")
    .eq("id", taskId)
    .single();

  if (task?.due_date) {
    const removedIds = prevIds.filter((id) => !userIds.includes(id));
    await Promise.all([
      // 外れた担当者のカレンダーから削除
      ...removedIds.map((uid) => deleteCalendarEvent(uid, taskId).catch(() => {})),
      // 現在の担当者全員のカレンダーに追加・更新（upsertなので重複しない）
      ...userIds.map((uid) =>
        upsertCalendarEvent(uid, { id: task.id, title: task.title, due_date: task.due_date!, due_time: task.due_time ?? null, notes: task.notes }).catch(() => {})
      ),
    ]);
  } else {
    // 期限がない場合は全員のカレンダーから削除
    await Promise.all(prevIds.map((uid) => deleteCalendarEvent(uid, taskId).catch(() => {})));
  }

  revalidatePath("/");
}
