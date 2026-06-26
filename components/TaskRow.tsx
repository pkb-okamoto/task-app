"use client";

import { useRef, useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { ChevronRight, Copy, ExternalLink, GripVertical, MoreHorizontal, Paperclip, Plus, Check } from "lucide-react";
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
import { updateTask, setTaskAssignees, duplicateTask } from "@/lib/actions/tasks";
import { useWorkspace } from "@/lib/workspace-context";
import { type Group, type Priority, type Task, type User } from "@/lib/types";

interface TaskRowProps {
  task: Task;
  users?: User[];
  groups?: Group[];
  depth?: number;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onAddSubtask?: (parentId: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

const PRIORITIES: Priority[] = ["緊急", "高", "中", "低"];

export default function TaskRow({
  task,
  users = [],
  groups = [],
  depth = 0,
  selected = false,
  onToggleSelect,
  onAddSubtask,
  onEdit,
  onDelete,
}: TaskRowProps) {
  const { refresh } = useWorkspace();
  const [expanded, setExpanded] = useState(true);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    opacity: isDragging ? 0 : 1,
  };
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  // インライン編集中のフィールドを管理
  const [editingField, setEditingField] = useState<string | null>(null);
  const [titleValue, setTitleValue] = useState(task.title);
  const [notesValue, setNotesValue] = useState(task.notes ?? "");
  const [progressValue, setProgressValue] = useState(String(task.progress));
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    task.assignees?.map((u) => u.id) ?? []
  );
  const [, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);


  const formatDate = (dateStr: string | null, timeStr?: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
    return timeStr ? `${date} ${timeStr}` : date;
  };

  // 期限超過・期限間近の判定
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const dueDaysLeft = dueDate && task.group_status !== "完了"
    ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isOverdue = task.progress < 100 && dueDaysLeft !== null && dueDaysLeft < 0;
  const isDueSoon = task.progress < 100 && dueDaysLeft !== null && dueDaysLeft >= 0 && dueDaysLeft <= 2;

  // タスク名を保存
  const saveTitle = () => {
    setEditingField(null);
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== task.title) {
      startTransition(async () => {
        await updateTask(task.id, { title: trimmed });
        refresh();
      });
    }
  };

  // 備考を保存
  const saveNotes = () => {
    setEditingField(null);
    const trimmed = notesValue.trim();
    if (trimmed !== (task.notes ?? "")) {
      startTransition(async () => {
        await updateTask(task.id, { notes: trimmed || null });
        refresh();
      });
    }
  };

  // 進捗率を保存
  const saveProgress = () => {
    setEditingField(null);
    const val = Math.min(100, Math.max(0, Number(progressValue)));
    if (val !== task.progress) {
      startTransition(async () => {
        await updateTask(task.id, { progress: val });
        refresh();
      });
    }
  };

  // 期限を保存
  const saveDueDate = (value: string) => {
    startTransition(async () => {
      await updateTask(task.id, { due_date: value || null });
      refresh();
    });
  };

  // 優先度を保存
  const savePriority = (priority: Priority) => {
    startTransition(async () => {
      await updateTask(task.id, { priority });
      refresh();
    });
  };

  // 担当者を保存（即時表示更新 → バックグラウンドでDB保存）
  const toggleAssignee = (userId: string) => {
    const next = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId];
    setSelectedUserIds(next);
    setTaskAssignees(task.id, next).catch(() => {
      // 失敗時は元に戻す
      setSelectedUserIds(selectedUserIds);
    });
  };

  // 日付をinput[type=date]のvalue形式に変換
  const toInputDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toISOString().split("T")[0];
  };

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        className={`group border-b border-gray-100 transition-colors ${
          isOverdue ? "bg-red-50 hover:bg-red-100/60" :
          isDueSoon ? "bg-yellow-50 hover:bg-yellow-100/60" :
          "hover:bg-blue-50/30"
        }`}
      >
        {/* チェックボックス */}
        <td className="py-1.5 px-2 w-8">
          {!task.parent_task_id && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(task.id)}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-gray-300 text-blue-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ opacity: selected ? 1 : undefined }}
            />
          )}
        </td>

        {/* タスク名 */}
        <td className="py-1.5 px-3">
          <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 20}px` }}>
            <span {...attributes} {...listeners} suppressHydrationWarning className="opacity-0 group-hover:opacity-100 cursor-grab shrink-0 touch-none">
              <GripVertical className="h-4 w-4 text-gray-300" />
            </span>
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

            {editingField === "title" ? (
              <input
                ref={titleRef}
                className="flex-1 text-sm border border-blue-400 rounded px-1.5 py-0.5 outline-none"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingField(null); }}
                autoFocus
              />
            ) : (
              <>
                <span
                  className="flex-1 text-sm text-gray-800 cursor-pointer hover:text-blue-600 hover:underline line-clamp-1"
                  onClick={() => setEditingField("title")}
                >
                  {task.title}
                </span>
                {(task.attachment_count ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5 text-gray-400 shrink-0">
                    <Paperclip className="h-3 w-3" />
                    <span className="text-[10px]">{task.attachment_count}</span>
                  </span>
                )}
              </>
            )}
          </div>
        </td>

        {/* 担当者 */}
        <td className="py-1.5 px-3">
          <DropdownMenu open={assigneeOpen} onOpenChange={setAssigneeOpen}>
            <DropdownMenuTrigger className="outline-none w-full">
              <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 min-h-[24px]">
                {selectedUserIds.length > 0 ? (
                  <>
                    {users.filter(u => selectedUserIds.includes(u.id)).slice(0, 3).map((user) => (
                      <Avatar key={user.id} className="h-6 w-6 ring-2 ring-white">
                        <AvatarImage src={user.avatar_url ?? ""} alt={user.name} />
                        <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {selectedUserIds.length > 3 && (
                      <span className="text-xs text-gray-400">+{selectedUserIds.length - 3}</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {users.length === 0 && (
                <DropdownMenuItem disabled>ユーザーなし</DropdownMenuItem>
              )}
              {users.map((user) => (
                <DropdownMenuItem
                  key={user.id}
                  className="gap-2"
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => toggleAssignee(user.id)}
                >
                  <Check
                    className={`h-3.5 w-3.5 ${selectedUserIds.includes(user.id) ? "opacity-100 text-blue-600" : "opacity-0"}`}
                  />
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.avatar_url ?? ""} />
                    <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{user.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>

        {/* 期限 */}
        <td className="py-1.5 px-3 w-36 min-w-[144px]">
          <div className="relative">
            {editingField === "due_date" ? (
              <input
                type="date"
                className="text-sm border border-blue-400 rounded px-1.5 py-0.5 outline-none w-full"
                defaultValue={toInputDate(task.due_date)}
                onChange={(e) => saveDueDate(e.target.value)}
                onBlur={() => setEditingField(null)}
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-1.5" onClick={() => setEditingField("due_date")}>
                <span
                  className={`text-sm cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 ${
                    isOverdue ? "text-red-600 font-semibold" :
                    isDueSoon ? "text-yellow-700 font-semibold" :
                    "text-gray-600"
                  }`}
                >
                  {formatDate(task.due_date, task.due_time)}
                </span>
                {isOverdue && (
                  <span className="text-[10px] font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {Math.abs(dueDaysLeft!)}日超過
                  </span>
                )}
                {isDueSoon && (
                  <span className="text-[10px] font-medium bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    明日期限
                  </span>
                )}
              </div>
            )}
          </div>
        </td>

        {/* ステータス（グループ） */}
        <td className="py-1.5 px-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <span className="text-xs text-gray-600 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5">
                {task.group_status || "—"}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {groups.map((g) => (
                <DropdownMenuItem
                  key={g.id}
                  className="gap-2"
                  onClick={() => {
                    startTransition(async () => {
                      await updateTask(task.id, { group_id: g.id, group_status: g.name });
                    });
                  }}
                >
                  <Check className={`h-3.5 w-3.5 ${task.group_id === g.id ? "opacity-100 text-blue-600" : "opacity-0"}`} />
                  <span className="text-sm">{g.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>

        {/* 進捗率 */}
        <td className="py-1.5 px-3">
          {editingField === "progress" ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                className="w-14 text-sm border border-blue-400 rounded px-1.5 py-0.5 outline-none"
                value={progressValue}
                onChange={(e) => setProgressValue(e.target.value)}
                onBlur={saveProgress}
                onKeyDown={(e) => { if (e.key === "Enter") saveProgress(); if (e.key === "Escape") setEditingField(null); }}
                autoFocus
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 min-w-[100px] cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
              onClick={() => setEditingField("progress")}
            >
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
              <span className="text-xs text-gray-500 w-8 text-right flex items-center justify-end gap-0.5">
                {task.progress === 100
                  ? <Check className="h-3 w-3 text-blue-500 shrink-0" />
                  : <>{task.progress}%</>}
              </span>
            </div>
          )}
        </td>

        {/* 備考 */}
        <td className="py-1.5 px-3">
          {editingField === "notes" ? (
            <input
              className="w-full text-sm border border-blue-400 rounded px-1.5 py-0.5 outline-none"
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              onBlur={saveNotes}
              onKeyDown={(e) => { if (e.key === "Enter") saveNotes(); if (e.key === "Escape") setEditingField(null); }}
              autoFocus
            />
          ) : task.notes ? (
            task.notes.startsWith("http") ? (
              <a
                href={task.notes}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                リンク <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span
                className="text-xs text-gray-600 line-clamp-1 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
                onClick={() => setEditingField("notes")}
              >
                {task.notes}
              </span>
            )
          ) : (
            <span
              className="text-xs text-gray-400 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
              onClick={() => setEditingField("notes")}
            >
              —
            </span>
          )}
        </td>

        {/* 優先度 */}
        <td className="py-1.5 px-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <div className="cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5">
                <PriorityBadge priority={task.priority} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {PRIORITIES.map((p) => (
                <DropdownMenuItem
                  key={p}
                  className="gap-2"
                  onClick={() => savePriority(p)}
                >
                  <Check className={`h-3.5 w-3.5 ${task.priority === p ? "opacity-100 text-blue-600" : "opacity-0"}`} />
                  <PriorityBadge priority={p} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>

        {/* アクションメニュー */}
        <td className="py-1.5 px-3">
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
                <DropdownMenuItem onClick={() => onEdit?.(task)}>詳細を編集</DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => {
                    startTransition(async () => {
                      await duplicateTask(task.id);
                      await refresh();
                    });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  コピー
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => onDelete?.(task.id)}>
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
            users={users}
            groups={groups}
            depth={depth + 1}
            onAddSubtask={onAddSubtask}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}
