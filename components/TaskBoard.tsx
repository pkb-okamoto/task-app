"use client";

import { useState, useTransition } from "react";
import { Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TaskGroup from "@/components/TaskGroup";
import TaskDialog from "@/components/TaskDialog";
import DeleteDialog from "@/components/DeleteDialog";
import { createTask } from "@/lib/actions/tasks";
import { type GroupStatus, type Task, type User } from "@/lib/types";

interface TaskBoardProps {
  initialTasks: Task[];
  users: User[];
}

const STATUS_ORDER: GroupStatus[] = ["未着手", "進行中", "完了"];

// タスクボードメインコンポーネント（Supabaseデータ連携版）
export default function TaskBoard({ initialTasks, users }: TaskBoardProps) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // 編集ダイアログ状態
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // 新規作成ダイアログ状態
  const [createStatus, setCreateStatus] = useState<GroupStatus>("未着手");
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // 削除ダイアログ状態
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ステータスごとにタスクをグループ分け（検索フィルタ付き）
  const grouped = STATUS_ORDER.reduce<Record<GroupStatus, Task[]>>(
    (acc, status) => {
      acc[status] = initialTasks.filter(
        (t) =>
          t.parent_task_id === null &&
          t.group_status === status &&
          t.title.includes(search)
      );
      return acc;
    },
    { 未着手: [], 進行中: [], 完了: [] }
  );

  // タスク追加ボタン押下
  const handleAddTask = (status: GroupStatus) => {
    setCreateStatus(status);
    setCreateParentId(null);
    setCreateOpen(true);
  };

  // サブタスク追加ボタン押下
  const handleAddSubtask = (parentId: string) => {
    setCreateParentId(parentId);
    setCreateStatus("未着手");
    setCreateOpen(true);
  };

  // 編集ボタン押下
  const handleEdit = (task: Task) => {
    setEditTarget(task);
    setEditOpen(true);
  };

  // 削除ボタン押下
  const handleDelete = (taskId: string) => {
    const task = initialTasks.find((t) => t.id === taskId);
    if (!task) return;
    setDeleteTarget({ id: taskId, title: task.title });
    setDeleteOpen(true);
  };

  // ヘッダーの「タスクを追加」ボタン
  const handleQuickAdd = () => {
    startTransition(async () => {
      await createTask({ title: "新しいタスク", group_status: "未着手" });
    });
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        {/* ボードツールバー */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white">
          <h1 className="text-base font-semibold text-gray-900 mr-2">タスクボード</h1>

          {/* 検索 */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="タスクを検索..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* フィルター */}
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
            <Filter className="h-3.5 w-3.5" />
            フィルター
          </Button>

          <div className="flex-1" />

          {/* タスクをすぐ追加（クイック追加） */}
          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleQuickAdd}
            disabled={isPending}
          >
            <Plus className="h-3.5 w-3.5" />
            タスクを追加
          </Button>
        </div>

        {/* グループ一覧 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {STATUS_ORDER.map((status) => (
            <TaskGroup
              key={status}
              status={status}
              tasks={grouped[status]}
              onAddTask={handleAddTask}
              onAddSubtask={handleAddSubtask}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      {/* タスク作成ダイアログ */}
      <TaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        task={null}
        defaultStatus={createStatus}
        parentTaskId={createParentId}
        users={users}
      />

      {/* タスク編集ダイアログ */}
      <TaskDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={editTarget}
        users={users}
      />

      {/* 削除確認ダイアログ */}
      {deleteTarget && (
        <DeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          taskId={deleteTarget.id}
          taskTitle={deleteTarget.title}
        />
      )}
    </>
  );
}
