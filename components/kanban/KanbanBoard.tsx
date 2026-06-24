"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import KanbanColumn from "@/components/kanban/KanbanColumn";
import KanbanCard from "@/components/kanban/KanbanCard";
import { updateTask } from "@/lib/actions/tasks";
import { type Group, type Task } from "@/lib/types";

interface KanbanBoardProps {
  tasks: Task[];
  groups: Group[];
  onAddTask: (groupId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

// カンバンボード（ドラッグ&ドロップでタスクをグループ間移動）
export default function KanbanBoard({
  tasks,
  groups,
  onAddTask,
  onEdit,
  onDelete,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  // ローカルでタスクのgroup_idを管理（楽観的更新）
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [, startTransition] = useTransition();

  // propsのtasksが変わったらローカル状態を同期（サーバー再取得後に反映）
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 5px動かしてからドラッグ開始（クリックと区別）
      activationConstraint: { distance: 5 },
    })
  );

  // グループごとのタスク一覧
  const tasksByGroup = (groupId: string) =>
    localTasks.filter((t) => t.parent_task_id === null && t.group_id === groupId);

  const handleDragStart = (event: DragStartEvent) => {
    const task = localTasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const draggedTask = localTasks.find((t) => t.id === activeId);
    if (!draggedTask) return;

    // overがグループIDかタスクIDかを判定
    const overGroup = groups.find((g) => g.id === overId);
    const overTask = localTasks.find((t) => t.id === overId);
    const targetGroupId = overGroup?.id ?? overTask?.group_id ?? null;

    if (targetGroupId && draggedTask.group_id !== targetGroupId) {
      const targetGroup = groups.find((g) => g.id === targetGroupId);
      // ローカル状態を楽観的に更新（即座にUIに反映）
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === activeId
            ? {
                ...t,
                group_id: targetGroupId,
                group_status: targetGroup?.name ?? t.group_status,
              }
            : t
        )
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // ドロップ後のローカル状態からgroup_idを取得
    const movedTask = localTasks.find((t) => t.id === activeId);
    if (!movedTask) return;

    const overGroup = groups.find((g) => g.id === overId);
    const overTask = localTasks.find((t) => t.id === overId);
    const targetGroupId = overGroup?.id ?? overTask?.group_id ?? movedTask.group_id;

    if (!targetGroupId) return;

    const targetGroup = groups.find((g) => g.id === targetGroupId);

    // Supabaseに保存（revalidatePathでサーバーから再取得→useEffectで同期）
    startTransition(async () => {
      await updateTask(activeId, {
        group_id: targetGroupId,
        group_status: targetGroup?.name ?? "",
      });
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {groups.map((group) => (
          <KanbanColumn
            key={group.id}
            group={group}
            tasks={tasksByGroup(group.id)}
            onAddTask={onAddTask}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* ドラッグ中のカードのゴースト表示 */}
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 opacity-90">
            <KanbanCard
              task={activeTask}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
