"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TaskRow from "@/components/TaskRow";
import { type Task, type GroupStatus } from "@/lib/types";

interface TaskGroupProps {
  status: GroupStatus;
  tasks: Task[];
  onAddTask: (status: GroupStatus) => void;
  onAddSubtask: (parentId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

// ステータスごとのグループヘッダー色
const groupColors: Record<GroupStatus, { dot: string; text: string; bg: string }> = {
  未着手: { dot: "bg-gray-400",  text: "text-gray-700",  bg: "bg-gray-50"  },
  進行中: { dot: "bg-blue-500",  text: "text-blue-700",  bg: "bg-blue-50"  },
  完了:   { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50" },
};

// タスクグループ（ステータスごとのセクション）
export default function TaskGroup({
  status,
  tasks,
  onAddTask,
  onAddSubtask,
  onEdit,
  onDelete,
}: TaskGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const color = groupColors[status];

  return (
    <div className="mb-6">
      {/* グループヘッダー */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-t-lg cursor-pointer select-none ${color.bg}`}
        onClick={() => setCollapsed(!collapsed)}
      >
        <ChevronDown
          className={`h-4 w-4 ${color.text} transition-transform ${collapsed ? "-rotate-90" : ""}`}
        />
        <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
        <span className={`text-sm font-semibold ${color.text}`}>{status}</span>
        <span className={`text-xs ${color.text} opacity-70`}>{tasks.length}件</span>
      </div>

      {/* タスクテーブル */}
      {!collapsed && (
        <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden bg-white">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">タスク名</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">担当者</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">期限</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">ステータス</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">進捗率</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">備考</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500">優先度</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-gray-400">
                    タスクがありません
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onAddSubtask={onAddSubtask}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))
              )}
            </tbody>
          </table>

          {/* タスク追加ボタン */}
          <div className="border-t border-gray-100">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-gray-500 hover:text-gray-700 rounded-none h-9"
              onClick={() => onAddTask(status)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-sm">タスクを追加</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
