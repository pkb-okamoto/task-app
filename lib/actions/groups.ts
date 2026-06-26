"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type Group, type GroupColor } from "@/lib/types";

// グループ一覧取得（position順）
export async function getGroups(workspaceId?: string | null): Promise<Group[]> {
  const supabase = await createClient();
  let query = supabase.from("groups").select("*").order("position", { ascending: true });

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else {
    query = query.is("workspace_id", null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

// グループ作成
export async function createGroup(input: { name: string; color: GroupColor; workspace_id?: string | null }) {
  const supabase = await createClient();

  let posQuery = supabase.from("groups").select("position").order("position", { ascending: false }).limit(1);
  if (input.workspace_id) {
    posQuery = posQuery.eq("workspace_id", input.workspace_id);
  } else {
    posQuery = posQuery.is("workspace_id", null);
  }

  const { data: last } = await posQuery.single();
  const position = (last?.position ?? -1) + 1;

  const { error } = await supabase.from("groups").insert({
    name: input.name,
    color: input.color,
    position,
    workspace_id: input.workspace_id ?? null,
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
