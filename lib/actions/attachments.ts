"use server";

import { createClient } from "@/lib/supabase/server";
import { type TaskAttachment } from "@/lib/types";

const BUCKET = "task-attachments";

// タスクの添付ファイル一覧を取得
export async function getAttachments(taskId: string): Promise<TaskAttachment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_attachments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ファイルをアップロードしてDBに登録
export async function uploadAttachment(taskId: string, formData: FormData): Promise<TaskAttachment> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("未認証");

  const file = formData.get("file") as File;
  if (!file) throw new Error("ファイルがありません");

  const ext = file.name.split(".").pop();
  const filePath = `${user.id}/${taskId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file);
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("task_attachments")
    .insert({
      task_id: taskId,
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// 添付ファイルを削除
export async function deleteAttachment(attachmentId: string, filePath: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("未認証");

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (storageError) throw new Error(storageError.message);

  const { error: dbError } = await supabase
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("user_id", user.id);
  if (dbError) throw new Error(dbError.message);
}

// 署名付きダウンロードURLを取得（60秒有効）
export async function getDownloadUrl(filePath: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
