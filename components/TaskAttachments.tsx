"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Image, Paperclip, Trash2, Upload, Download } from "lucide-react";
import { getAttachments, uploadAttachment, deleteAttachment, getDownloadUrl } from "@/lib/actions/attachments";
import { type TaskAttachment } from "@/lib/types";

interface TaskAttachmentsProps {
  taskId: string;
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};

const FileIcon = ({ mimeType }: { mimeType: string | null }) => {
  if (mimeType?.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-gray-400" />;
};

export default function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAttachments(taskId).then(setAttachments).catch(() => {});
  }, [taskId]);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert(`ファイルサイズは5MB以内にしてください（選択ファイル：${formatSize(file.size)}）`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const newAttachment = await uploadAttachment(taskId, formData);
      setAttachments((prev) => [...prev, newAttachment]);
    } catch (err) {
      alert("アップロードに失敗しました");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (attachment: TaskAttachment) => {
    if (!confirm(`「${attachment.file_name}」を削除しますか？`)) return;
    await deleteAttachment(attachment.id, attachment.file_path).catch(() => {});
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
  };

  const handleDownload = async (attachment: TaskAttachment) => {
    try {
      const url = await getDownloadUrl(attachment.file_path);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      a.click();
    } catch {
      alert("ダウンロードに失敗しました");
    }
  };

  return (
    <div className="grid gap-2">
      {/* ファイル一覧 */}
      {attachments.length > 0 && (
        <div className="space-y-1 overflow-hidden w-full">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-50 hover:bg-gray-100 group w-full overflow-hidden"
            >
              <span className="shrink-0"><FileIcon mimeType={a.mime_type} /></span>
              <span className="text-xs text-gray-700 flex-1 truncate min-w-0">{a.file_name}</span>
              {a.file_size && (
                <span className="text-xs text-gray-400 shrink-0 ml-1">{formatSize(a.file_size)}</span>
              )}
              <button
                onClick={() => handleDownload(a)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 text-gray-500"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(a)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* アップロードボタン */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          {uploading ? (
            <Upload className="h-3.5 w-3.5 animate-pulse" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
          {uploading ? "アップロード中..." : "ファイルを添付"}
        </button>
      </div>
    </div>
  );
}
