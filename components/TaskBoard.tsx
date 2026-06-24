"use client";

import { useState, useTransition } from "react";
import { Filter, Plus, Search, LayoutList, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TaskGroup from "@/components/TaskGroup";
import TaskDialog from "@/components/TaskDialog";
import DeleteDialog from "@/components/DeleteDialog";
import GroupDialog from "@/components/GroupDialog";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import { createTask } from "@/lib/actions/tasks";
import { type Group, type Task, type User } from "@/lib/types";

type ViewMode = "table" | "kanban";

interface TaskBoardProps {
  initialTasks: Task[];
  initialGroups: Group[];
  users: User[];
}

// タスクボードメインコンポーネント（カスタムグループ対応版）
export default function TaskBoard({ initialTasks, initialGroups, users }: TaskBoardProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isPending, startTransition] = useTransition();

  // タスク編集ダイアログ
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // タスク新規作成ダイアログ
  const [createGroupId, setCreateGroupId] = useState<string | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // タスク削除ダイアログ
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // グループ追加・編集ダイアログ
  const [groupEditTarget, setGroupEditTarget] = useState<Group | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  // タスク名・備考・担当者名で横断検索
  const matchesSearch = (t: Task) => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (t.title.toLowerCase().includes(q)) return true;
    if (t.notes?.toLowerCase().includes(q)) return true;
    if (t.assignees?.some((u) => u.name.toLowerCase().includes(q))) return true;
    return false;
  };

  // グループごとにタスクをグループ分け
  const tasksByGroup = (groupId: string) =>
    initialTasks.filter(
      (t) => t.parent_task_id === null && t.group_id === groupId && matchesSearch(t)
    );

  // グループなしのタスク
  const ungroupedTasks = initialTasks.filter(
    (t) => t.parent_task_id === null && !t.group_id && matchesSearch(t)
  );

  const handleAddTask = (groupId: string) => {
    setCreateGroupId(groupId);
    setCreateParentId(null);
    setCreateOpen(true);
  };

  const handleAddSubtask = (parentId: string) => {
    setCreateParentId(parentId);
    setCreateGroupId(null);
    setCreateOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditTarget(task);
    setEditOpen(true);
  };

  const handleDelete = (taskId: string) => {
    const task = initialTasks.find((t) => t.id === taskId);
    if (!task) return;
    setDeleteTarget({ id: taskId, title: task.title });
    setDeleteOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setGroupEditTarget(group);
    setGroupDialogOpen(true);
  };

  const handleAddGroup = () => {
    setGroupEditTarget(null);
    setGroupDialogOpen(true);
  };

  const handleQuickAdd = () => {
    const firstGroup = initialGroups[0];
    startTransition(async () => {
      await createTask({
        title: "新しいタスク",
        group_id: firstGroup?.id ?? null,
        group_status: firstGroup?.name ?? "未着手",
      });
    });
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        {/* ツールバー */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white">
          <h1 className="text-base font-semibold text-gray-900 mr-2">タスクボード</h1>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="タスクを検索..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
            <Filter className="h-3.5 w-3.5" />
            フィルター
          </Button>

          {/* ビュー切り替え */}
          <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${
                viewMode === "table" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              テーブル
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${
                viewMode === "kanban" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              カンバン
            </button>
          </div>

          <div className="flex-1" />

          {/* グループ追加ボタン */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleAddGroup}
          >
            <Plus className="h-3.5 w-3.5" />
            グループを追加
          </Button>

          {/* タスク追加ボタン */}
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
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* カンバンビュー */}
          {viewMode === "kanban" && (
            <KanbanBoard
              tasks={initialTasks.filter((t) => matchesSearch(t))}
              groups={initialGroups}
              onAddTask={handleAddTask}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {/* テーブルビュー */}
          {viewMode === "table" && (
            <>
              {initialGroups.map((group) => (
                <TaskGroup
                  key={group.id}
                  group={group}
                  tasks={tasksByGroup(group.id)}
                  onAddTask={handleAddTask}
                  onAddSubtask={handleAddSubtask}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onEditGroup={handleEditGroup}
                />
              ))}

              {/* グループなしのタスク */}
              {ungroupedTasks.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gray-50">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                    <span className="text-sm font-semibold text-gray-500">グループなし</span>
                    <span className="text-xs text-gray-400">{ungroupedTasks.length}件</span>
                  </div>
                  <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden bg-white">
                    <table className="w-full text-sm table-fixed">
                      <tbody>
                        {ungroupedTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onAddSubtask={handleAddSubtask}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* グループがない場合の案内 */}
              {initialGroups.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <p className="text-sm mb-3">グループがありません</p>
                  <Button variant="outline" size="sm" onClick={handleAddGroup}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    グループを追加
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* タスク作成ダイアログ */}
      <TaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        task={null}
        defaultGroupId={createGroupId}
        parentTaskId={createParentId}
        users={users}
        groups={initialGroups}
      />

      {/* タスク編集ダイアログ */}
      <TaskDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={editTarget}
        users={users}
        groups={initialGroups}
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

      {/* グループ追加・編集ダイアログ */}
      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        group={groupEditTarget}
      />
    </>
  );
}

// TaskRowのインポート（循環参照を避けるため末尾に）
import TaskRow from "@/components/TaskRow";
