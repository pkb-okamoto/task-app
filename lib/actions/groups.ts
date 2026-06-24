"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type Group, type GroupColor } from "@/lib/types";

// グループ一覧取得（position順）
export async function getGroups(): Promise<Group[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// グループ作成
export async function createGroup(input: { name: string; color: GroupColor }) {
  const supabase = await createClient();

  // 現在の最大positionを取得して末尾に追加
  const { data: last } = await supabase
    .from("groups")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (last?.position ?? -1) + 1;

  const { error } = await supabase.from("groups").insert({
    name: input.name,
    color: input.color,
    position,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// グループ更新（名前・色）
export async function updateGroup(
  groupId: string,
  input: Partial<{ name: string; color: GroupColor }>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("groups").update(input).eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// グループ削除（タスクのgroup_idはNULLになる）
export async function deleteGroup(groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// グループの並び順を更新
export async function reorderGroups(groupIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    groupIds.map((id, index) =>
      supabase.from("groups").update({ position: index }).eq("id", id)
    )
  );
  revalidatePath("/");
}
