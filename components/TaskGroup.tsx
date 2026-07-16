"use client";

import { useState, useTransition } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronDown, MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TaskRow from "@/components/TaskRow";
import { groupColorStyles } from "@/components/TaskBadges";
import { deleteGroup } from "@/lib/actions/groups";
import { useWorkspace } from "@/lib/workspace-context";
import { type Group, type Task, type User } from "@/lib/types";

interface TaskGroupProps {
  group: Group;
  tasks: Task[];
  allTaskIds?: string[];
  users?: User[];
  groups?: Group[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onAddTask: (groupId: string) => void;
  onAddSubtask: (parentId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onEditGroup: (group: Group) => void;
}

// タスクグループ（グループごとのセクション）
export default function TaskGroup({
  group,
  tasks,
  allTaskIds,
  users = [],
  groups = [],
  selectedIds,
  onToggleSelect,
  onAddTask,
  onAddSubtask,
  onEdit,
  onDelete,
  onEditGroup,
}: TaskGroupProps) {
  const [collapsed, setCollapsed] = useState(group.name === "完了");
  const [isPending, startTransition] = useTransition();
  const color = groupColorStyles[group.color] ?? groupColorStyles.gray;
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: group.id });
  const { refresh } = useWorkspace();

  const handleDeleteGroup = () => {
    if (!confirm(`「${group.name}」を削除しますか？\nこのグループのタスクはグループなしになります。`)) return;
    startTransition(async () => {
      await deleteGroup(group.id);
      refresh();
    });
  };

  return (
    <div className="mb-6">
      {/* グループヘッダー */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${color.bg}`}>
        {/* 折りたたみボタン */}
        <button onClick={() => setCollapsed(!collapsed)}>
          <ChevronDown
            className={`h-4 w-4 ${color.text} transition-transform ${collapsed ? "-rotate-90" : ""}`}
          />
        </button>

        <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
        <span className={`text-sm font-semibold ${color.text} flex-1 cursor-pointer select-none`}
          onClick={() => setCollapsed(!collapsed)}>
          {group.name}
        </span>
        <span className={`text-xs ${color.text} opacity-70`}>{tasks.length}件</span>

        {/* グループ操作メニュー */}
        <DropdownMenu>
          <DropdownMenuTrigger className={`p-1 rounded hover:bg-black/5 outline-none ${color.text}`}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="gap-2" onClick={() => onEditGroup(group)}>
              <Pencil className="h-4 w-4" />
              グループを編集
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-red-600"
              onClick={handleDeleteGroup}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
              グループを削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* タスクテーブル */}
      {!collapsed && (
        <div ref={setDropRef} className={`border border-t-0 border-gray-200 rounded-b-lg overflow-hidden bg-white ${isOver ? "ring-2 ring-blue-300 ring-inset" : ""}`}>
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[24%]" />
              <col className="w-[8%]" />
              <col className="w-[15%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[7%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-2 px-2" />
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
                  <td colSpan={9} className="py-6 text-center text-sm text-gray-400">
                    タスクがありません
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    users={users}
                    groups={groups}
                    selected={selectedIds?.has(task.id) ?? false}
                    onToggleSelect={onToggleSelect}
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
              onClick={() => onAddTask(group.id)}
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
