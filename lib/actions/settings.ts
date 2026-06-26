"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface UserSettings {
  user_id: string;
  mention_notify: boolean;
  default_priority: string;
}

export async function getUserSettings(): Promise<UserSettings | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) {
    // 初回はデフォルト値で作成
    const defaults: Omit<UserSettings, never> = {
      user_id: user.id,
      mention_notify: true,
      default_priority: "中",
    };
    await supabase.from("user_settings").insert(defaults);
    return defaults;
  }

  return data;
}

export async function updateUserSettings(
  input: Partial<Omit<UserSettings, "user_id">>
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ...input })
    .eq("user_id", user.id);

  revalidatePath("/");
}

export async function exportTasksCSV(): Promise<string> {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      title, group_status, due_date, due_time, progress, notes, priority,
      assignees:task_assignees(user:users(name))
    `)
    .is("workspace_id", null)
    .is("parent_task_id", null)
    .order("created_at", { ascending: true });

  if (!tasks || tasks.length === 0) return "";

  const header = ["タスク名", "ステータス", "期限", "進捗率(%)", "優先度", "担当者", "備考"];
  const rows = tasks.map((t) => {
    const assignees = (t.assignees as unknown as { user: { name: string } }[])
      .map((a) => a.user.name)
      .join("・");
    const due = t.due_date ? (t.due_time ? `${t.due_date} ${t.due_time}` : t.due_date) : "";
    return [
      t.title,
      t.group_status ?? "",
      due,
      String(t.progress ?? 0),
      t.priority ?? "",
      assignees,
      t.notes ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });

  return [header.join(","), ...rows].join("\n");
}
