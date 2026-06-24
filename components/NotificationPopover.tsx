"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type User } from "@/lib/types";

interface NotificationPopoverProps {
  currentUser: User | null;
}

interface NearTask {
  id: string;
  title: string;
  due_date: string;
  days: number;
}

// 期限まで何日かを計算
function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ベルアイコンをクリックすると期限が近いタスクを表示するポップオーバー
export default function NotificationPopover({ currentUser }: NotificationPopoverProps) {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<NearTask[]>([]);
  const [loading, setLoading] = useState(false);

  // ポップオーバーを開いたときにタスクを取得
  useEffect(() => {
    if (!open || !currentUser) return;

    const fetchTasks = async () => {
      setLoading(true);
      const supabase = createClient();
      const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { data } = await supabase
        .from("task_assignees")
        .select("task:tasks(id, title, due_date, group_status)")
        .eq("user_id", currentUser.id);

      const nearTasks = (data ?? [])
        .map((a) => a.task as unknown as { id: string; title: string; due_date: string | null; group_status: string } | null)
        .filter((t): t is NonNullable<typeof t> =>
          t !== null &&
          t.due_date !== null &&
          t.group_status !== "完了" &&
          t.due_date <= threeDaysLater
        )
        .map((t) => ({
          id: t.id,
          title: t.title,
          due_date: t.due_date!,
          days: daysUntil(t.due_date!),
        }))
        .sort((a, b) => a.days - b.days);

      setTasks(nearTasks);
      setLoading(false);
    };

    fetchTasks();
  }, [open, currentUser]);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#notification-popover")) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const dayLabel = (days: number) => {
    if (days < 0) return { text: `${Math.abs(days)}日超過`, color: "text-red-600" };
    if (days === 0) return { text: "今日が期限", color: "text-orange-600" };
    return { text: `あと${days}日`, color: "text-blue-600" };
  };

  return (
    <div id="notification-popover" className="relative">
      {/* ベルボタン */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {/* 未読バッジ（担当タスクがある場合のみ表示） */}
        {tasks.length > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      {/* ポップオーバー */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* ヘッダー */}
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">期限が近いタスク</h3>
            <p className="text-xs text-gray-500 mt-0.5">自分が担当・期限3日以内</p>
          </div>

          {/* タスク一覧 */}
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">読み込み中...</div>
            ) : tasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                期限が近いタスクはありません
              </div>
            ) : (
              tasks.map((task) => {
                const { text, color } = dayLabel(task.days);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-50 hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(task.due_date).toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold ml-3 shrink-0 ${color}`}>
                      {text}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* フッター */}
          {tasks.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">{tasks.length}件のタスク</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
