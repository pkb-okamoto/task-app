"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Calendar, GripVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriorityBadge } from "@/components/TaskBadges";
import { type Task } from "@/lib/types";

interface KanbanCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

// カンバンカード（ドラッグ可能なタスクカード）
export default function KanbanCard({ task, onEdit, onDelete }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // 期限切れチェック
  const isOverdue = task.due_date
    ? new Date(task.due_date) < new Date() && task.group_status !== "完了"
    : false;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 group hover:shadow-md transition-shadow"
    >
      {/* カードヘッダー：ドラッグハンドル＋メニュー */}
      <div className="flex items-start gap-2 mb-2">
        {/* ドラッグハンドル */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 p-0.5 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* タスク名 */}
        <span
          className="flex-1 text-sm font-medium text-gray-800 cursor-pointer hover:text-blue-600 leading-snug"
          onClick={() => onEdit(task)}
        >
          {task.title}
        </span>

        {/* アクションメニュー */}
        <DropdownMenu>
          <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 outline-none transition-opacity">
            <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task)}>編集</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(task.id)}>
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 優先度バッジ */}
      <div className="mb-2">
        <PriorityBadge priority={task.priority} />
      </div>

      {/* 進捗バー */}
      {task.progress > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <Progress
            value={task.progress}
            className="h-1.5 flex-1"
            indicatorClassName={
              task.progress === 100 ? "bg-blue-500" :
              task.progress < 30 ? "bg-red-500" :
              task.progress <= 70 ? "bg-yellow-400" :
              "bg-green-500"
            }
          />
          <span className="text-xs text-gray-400 w-7 text-right">{task.progress}%</span>
        </div>
      )}

      {/* フッター：担当者＋期限 */}
      <div className="flex items-center justify-between mt-2">
        {/* 担当者アバター */}
        <div className="flex -space-x-1">
          {task.assignees && task.assignees.length > 0 ? (
            task.assignees.slice(0, 3).map((user) => (
              <Avatar key={user.id} className="h-5 w-5 ring-2 ring-white">
                <AvatarImage src={user.avatar_url ?? ""} alt={user.name} />
                <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))
          ) : (
            <span className="text-xs text-gray-300">担当者なし</span>
          )}
        </div>

        {/* 期限 */}
        {task.due_date && (
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600" : "text-gray-400"}`}>
            <Calendar className="h-3 w-3" />
            {formatDate(task.due_date)}
          </div>
        )}
      </div>
    </div>
  );
}
