"use client";

import { useState } from "react";
import { ChevronRight, ExternalLink, GripVertical, MoreHorizontal, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PriorityBadge } from "@/components/TaskBadges";
import { type Task } from "@/lib/types";

interface TaskRowProps {
  task: Task;
  depth?: number;          // サブタスクのネスト深さ
  onAddSubtask?: (parentId: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

export default function TaskRow({
  task,
  depth = 0,
  onAddSubtask,
  onEdit,
  onDelete,
}: TaskRowProps) {
  // サブタスクの折りたたみ状態
  const [expanded, setExpanded] = useState(true);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  // 期限の表示フォーマット
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  // 期限切れチェック
  const isOverdue = task.due_date
    ? new Date(task.due_date) < new Date() && task.group_status !== "完了"
    : false;

  return (
    <>
      <tr className="group border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
        {/* ドラッグハンドル＋タスク名 */}
        <td className="py-2 px-3">
          <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 20}px` }}>
            {/* ドラッグハンドル（ホバー時表示） */}
            <GripVertical className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />

            {/* サブタスク折りたたみボタン */}
            {hasSubtasks ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-0.5 rounded hover:bg-gray-200 transition-colors"
              >
                <ChevronRight
                  className={`h-3.5 w-3.5 text-gray-500 transition-transform ${expanded ? "rotate-90" : ""}`}
                />
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}

            {/* タスク名 */}
            <span
              className="text-sm text-gray-800 cursor-pointer hover:text-blue-600 hover:underline line-clamp-1"
              onClick={() => onEdit?.(task)}
            >
              {task.title}
            </span>
          </div>
        </td>

        {/* 担当者 */}
        <td className="py-2 px-3">
          <div className="flex items-center gap-1">
            {task.assignees && task.assignees.length > 0 ? (
              <>
                {task.assignees.slice(0, 3).map((user) => (
                  <Tooltip key={user.id}>
                    <TooltipTrigger className="cursor-default">
                      <Avatar className="h-6 w-6 ring-2 ring-white">
                        <AvatarImage src={user.avatar_url ?? ""} alt={user.name} />
                        <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{user.name}</TooltipContent>
                  </Tooltip>
                ))}
                {task.assignees.length > 3 && (
                  <span className="text-xs text-gray-400">+{task.assignees.length - 3}</span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </div>
        </td>

        {/* 期限 */}
        <td className="py-2 px-3">
          <span className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"}`}>
            {formatDate(task.due_date)}
          </span>
        </td>

        {/* ステータス */}
        <td className="py-2 px-3">
          <span className="text-xs text-gray-600">{task.group_status}</span>
        </td>

        {/* 進捗率 */}
        <td className="py-2 px-3">
          <div className="flex items-center gap-2 min-w-[100px]">
            <Progress value={task.progress} className="h-1.5 flex-1" />
            <span className="text-xs text-gray-500 w-8 text-right">{task.progress}%</span>
          </div>
        </td>

        {/* 備考 */}
        <td className="py-2 px-3">
          {task.notes ? (
            task.notes.startsWith("http") ? (
              <a
                href={task.notes}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                リンク
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-xs text-gray-600 line-clamp-1">{task.notes}</span>
            )
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>

        {/* 優先度 */}
        <td className="py-2 px-3">
          <PriorityBadge priority={task.priority} />
        </td>

        {/* アクションメニュー */}
        <td className="py-2 px-3">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                onClick={() => onAddSubtask?.(task.id)}
              >
                <Plus className="h-3.5 w-3.5 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent>サブタスクを追加</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger className="p-1 rounded hover:bg-gray-100 transition-colors outline-none">
                <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(task)}>編集</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onDelete?.(task.id)}
                >
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      {/* サブタスクを再帰的に表示 */}
      {expanded &&
        task.subtasks?.map((subtask) => (
          <TaskRow
            key={subtask.id}
            task={subtask}
            depth={depth + 1}
            onAddSubtask={onAddSubtask}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}
