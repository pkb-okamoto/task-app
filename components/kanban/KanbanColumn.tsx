"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import KanbanCard from "@/components/kanban/KanbanCard";
import { groupColorStyles } from "@/components/TaskBadges";
import { type Group, type Task } from "@/lib/types";

interface KanbanColumnProps {
  group: Group;
  tasks: Task[];
  onAddTask: (groupId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

// カンバン列（グループ = 列）
export default function KanbanColumn({
  group,
  tasks,
  onAddTask,
  onEdit,
  onDelete,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id });
  const color = groupColorStyles[group.color] ?? groupColorStyles.gray;

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* 列ヘッダー */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${color.bg}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
        <span className={`text-sm font-semibold ${color.text} flex-1`}>{group.name}</span>
        <span className={`text-xs ${color.text} opacity-70`}>{tasks.length}</span>
      </div>

      {/* ドロップゾーン＋カード一覧 */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 p-2 rounded-b-lg border border-t-0 border-gray-200 min-h-[120px] transition-colors ${
          isOver ? "bg-blue-50" : "bg-gray-50"
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {/* タスク追加ボタン */}
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-1.5 text-gray-400 hover:text-gray-600 h-8 mt-auto"
          onClick={() => onAddTask(group.id)}
        >
          <Plus className="h-3.5 w-3.5" />
          追加
        </Button>
      </div>
    </div>
  );
}
