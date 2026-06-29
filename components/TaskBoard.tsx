"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowUpDown, CheckSquare, EyeOff, Eye, Filter, Plus, Search, LayoutList, Columns, Trash2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TaskGroup from "@/components/TaskGroup";
import TaskDialog from "@/components/TaskDialog";
import DeleteDialog from "@/components/DeleteDialog";
import GroupDialog from "@/components/GroupDialog";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import { createTask, deleteTask, updateTaskPositions } from "@/lib/actions/tasks";
import { useWorkspace } from "@/lib/workspace-context";
import { type Group, type Task, type User } from "@/lib/types";

type ViewMode = "table" | "kanban";

interface TaskBoardProps {
  initialTasks: Task[];
  initialGroups: Group[];
  users: User[];
  workspaceId?: string | null;
}

// タスクボードメインコンポーネント（ワークスペース対応版）
export default function TaskBoard({ initialTasks, initialGroups, users, workspaceId }: TaskBoardProps) {
  const { refresh } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // refresh() 後に親から新しいタスクが渡されたら同期
  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortBy, setSortBy] = useState<"none" | "due_date" | "priority">("none");

  // 完了タスク非表示
  const [hideCompleted, setHideCompleted] = useState(false);

  // 一括選択
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = () => {
    if (!confirm(`${selectedIds.size}件のタスクを削除しますか？`)) return;
    startTransition(async () => {
      await Promise.all([...selectedIds].map((id) => deleteTask(id)));
      clearSelection();
    });
  };

  // フィルター状態
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAssignees, setFilterAssignees] = useState<string[]>([]);
  const [filterPriorities, setFilterPriorities] = useState<string[]>([]);
  const [filterProgress, setFilterProgress] = useState<string[]>([]);

  const activeFilterCount = filterAssignees.length + filterPriorities.length + filterProgress.length;

  const clearFilters = () => {
    setFilterAssignees([]);
    setFilterPriorities([]);
    setFilterProgress([]);
  };

  const toggleItem = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];

  // ドラッグセンサー（5px動かしてからドラッグ開始）
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = tasks.find((t) => t.id === activeId) ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // over.id がグループIDの場合（グループの空き領域にドロップ）
    const overGroup = initialGroups.find((g) => g.id === over.id);
    if (overGroup) {
      if (activeTask.group_id === overGroup.id) return;
      const overGroupTasks = tasks.filter((t) => t.group_id === overGroup.id && !t.parent_task_id);
      const updates = [
        { id: activeTask.id, position: overGroupTasks.length + 1, group_id: overGroup.id, group_status: overGroup.name },
        ...tasks
          .filter((t) => t.group_id === activeTask.group_id && t.id !== activeTask.id && !t.parent_task_id)
          .map((t, i) => ({ id: t.id, position: i + 1, group_id: t.group_id, group_status: t.group_status })),
      ];
      setTasks((prev) => prev.map((t) =>
        t.id === activeTask.id ? { ...t, group_id: overGroup.id, group_status: overGroup.name } : t
      ));
      startTransition(async () => { await updateTaskPositions(updates); });
      return;
    }

    const overTask = tasks.find((t) => t.id === over.id);
    if (!overTask) return;

    if (activeTask.group_id === overTask.group_id) {
      // 同じグループ内の並び替え
      const groupTasks = tasks.filter((t) => t.group_id === activeTask.group_id && !t.parent_task_id);
      const oldIndex = groupTasks.findIndex((t) => t.id === active.id);
      const newIndex = groupTasks.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(groupTasks, oldIndex, newIndex);
      const updates = reordered.map((t, i) => ({
        id: t.id, position: i + 1, group_id: t.group_id, group_status: t.group_status,
      }));
      setTasks((prev) => {
        const others = prev.filter((t) => t.group_id !== activeTask.group_id || t.parent_task_id);
        return [...others, ...reordered.map((t, i) => ({ ...t, position: i + 1 }))];
      });
      startTransition(async () => { await updateTaskPositions(updates); });
    } else {
      // 別グループへの移動
      const overGroup = initialGroups.find((g) => g.id === overTask.group_id);
      if (!overGroup) return;

      const overGroupTasks = tasks.filter((t) => t.group_id === overTask.group_id && !t.parent_task_id);
      const overIndex = overGroupTasks.findIndex((t) => t.id === over.id);
      const newGroupTasks = [...overGroupTasks];
      newGroupTasks.splice(overIndex, 0, { ...activeTask, group_id: overTask.group_id, group_status: overGroup.name });

      const updates = [
        ...newGroupTasks.map((t, i) => ({
          id: t.id, position: i + 1, group_id: overTask.group_id, group_status: overGroup.name,
        })),
        ...tasks
          .filter((t) => t.group_id === activeTask.group_id && t.id !== activeTask.id && !t.parent_task_id)
          .map((t, i) => ({
            id: t.id, position: i + 1, group_id: t.group_id, group_status: t.group_status,
          })),
      ];

      setTasks((prev) => prev.map((t) =>
        t.id === activeTask.id
          ? { ...t, group_id: overTask.group_id, group_status: overGroup.name }
          : t
      ));
      startTransition(async () => { await updateTaskPositions(updates); });
    }
  };
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

  // タスク名・備考・担当者名で横断検索＋フィルター適用
  const matchesSearch = (t: Task) => {
    if (search) {
      const q = search.toLowerCase();
      const hit = t.title.toLowerCase().includes(q)
        || t.notes?.toLowerCase().includes(q)
        || t.assignees?.some((u) => u.name.toLowerCase().includes(q));
      if (!hit) return false;
    }
    if (filterAssignees.length > 0) {
      const assigneeIds = t.assignees?.map((u) => u.id) ?? [];
      if (!filterAssignees.some((id) => assigneeIds.includes(id))) return false;
    }
    if (filterPriorities.length > 0) {
      if (!filterPriorities.includes(t.priority)) return false;
    }
    if (filterProgress.length > 0) {
      const inProgress = filterProgress.includes("進行中") && t.progress > 0 && t.progress < 100;
      const notStarted = filterProgress.includes("未着手") && t.progress === 0;
      const completed = filterProgress.includes("完了") && t.progress === 100;
      if (!inProgress && !notStarted && !completed) return false;
    }
    return true;
  };

  const PRIORITY_ORDER: Record<string, number> = { 緊急: 0, 高: 1, 中: 2, 低: 3 };

  const sortTasks = (tasks: Task[]) => {
    if (sortBy === "due_date") {
      return [...tasks].sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
    }
    if (sortBy === "priority") {
      return [...tasks].sort(
        (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
      );
    }
    return tasks;
  };

  // グループごとにタスクをグループ分け
  const tasksByGroup = (groupId: string) =>
    sortTasks(
      tasks.filter(
        (t) => t.parent_task_id === null && t.group_id === groupId && matchesSearch(t)
          && !(hideCompleted && t.progress === 100)
      )
    );

  // グループなしのタスク
  const ungroupedTasks = sortTasks(
    tasks.filter(
      (t) => t.parent_task_id === null && !t.group_id && matchesSearch(t)
        && !(hideCompleted && t.progress === 100)
    )
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
    const task = tasks.find((t) => t.id === taskId);
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

  // 一括グループ移動
  const handleBulkMove = (group: Group) => {
    startTransition(async () => {
      const updates = [...selectedIds].map((id, i) => ({
        id,
        position: i + 1,
        group_id: group.id,
        group_status: group.name,
      }));
      await updateTaskPositions(updates);
      clearSelection();
    });
  };

  const handleQuickAdd = () => {
    const firstGroup = initialGroups[0];
    startTransition(async () => {
      await createTask({
        title: "新しいタスク",
        group_id: firstGroup?.id ?? null,
        group_status: firstGroup?.name ?? "未着手",
        workspace_id: workspaceId ?? null,
      });
      refresh();
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
              className="pl-8 pr-7 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 h-8 text-xs relative ${activeFilterCount > 0 ? "border-blue-500 text-blue-600" : ""}`}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter className="h-3.5 w-3.5" />
            フィルター
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* ソートボタン */}
          <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
            <button
              onClick={() => setSortBy(sortBy === "due_date" ? "none" : "due_date")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${
                sortBy === "due_date" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <ArrowUpDown className="h-3 w-3" />
              期限順
            </button>
            <button
              onClick={() => setSortBy(sortBy === "priority" ? "none" : "priority")}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors border-l border-gray-200 ${
                sortBy === "priority" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <ArrowUpDown className="h-3 w-3" />
              優先度順
            </button>
          </div>

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

          {/* 完了非表示トグル */}
          <button
            onClick={() => setHideCompleted((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
              hideCompleted
                ? "bg-gray-900 text-white border-gray-900"
                : "text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {hideCompleted ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {hideCompleted ? "完了を表示" : "完了を非表示"}
          </button>

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

        {/* フィルターパネル */}
        {filterOpen && (
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex flex-wrap gap-6 items-start">
            {/* 担当者 */}
            {users.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">担当者</p>
                <div className="flex flex-wrap gap-1.5">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setFilterAssignees(toggleItem(filterAssignees, u.id))}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border transition-colors ${
                        filterAssignees.includes(u.id)
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={u.avatar_url ?? ""} />
                        <AvatarFallback className="text-[8px] bg-blue-100 text-blue-700">{u.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 優先度 */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">優先度</p>
              <div className="flex gap-1.5">
                {["緊急", "高", "中", "低"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPriorities(toggleItem(filterPriorities, p))}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      filterPriorities.includes(p)
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 進捗状態 */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">進捗状態</p>
              <div className="flex gap-1.5">
                {["未着手", "進行中", "完了"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterProgress(toggleItem(filterProgress, s))}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      filterProgress.includes(s)
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* リセット */}
            {activeFilterCount > 0 && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                  リセット
                </button>
              </div>
            )}
          </div>
        )}

        {/* グループ一覧 */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* カンバンビュー */}
          {viewMode === "kanban" && (
            <KanbanBoard
              tasks={tasks.filter((t) => matchesSearch(t))}
              groups={initialGroups}
              onAddTask={handleAddTask}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {/* テーブルビュー */}
          {viewMode === "table" && (
            <DndContext id="task-board-dnd" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={tasks.filter((t) => !t.parent_task_id).map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <>
              {initialGroups.map((group) => (
                <TaskGroup
                  key={group.id}
                  group={group}
                  tasks={tasksByGroup(group.id)}
                  users={users}
                  groups={initialGroups}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
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
                            selected={selectedIds.has(task.id)}
                            onToggleSelect={toggleSelect}
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
            </SortableContext>
            <DragOverlay>
              {activeTask && (
                <table className="w-full text-sm table-fixed bg-white shadow-lg rounded border border-blue-200" style={{ opacity: 0.95 }}>
                  <tbody>
                    <tr className="bg-blue-50">
                      <td className="py-1.5 px-3 text-sm font-medium text-gray-800">{activeTask.title}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      {/* バルクアクションバー */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl">
          <CheckSquare className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">{selectedIds.size}件選択中</span>
          <div className="w-px h-4 bg-gray-600" />

          {/* グループ移動 */}
          <div className="relative group/move">
            <button className="flex items-center gap-1.5 text-sm text-gray-200 hover:text-white transition-colors">
              <ArrowUpDown className="h-3.5 w-3.5" />
              グループへ移動
            </button>
            <div className="absolute bottom-full mb-2 left-0 hidden group-hover/move:block bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]">
              {initialGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleBulkMove(g)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-4 bg-gray-600" />
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            削除
          </button>
          <button
            onClick={clearSelection}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 transition-colors ml-1"
          >
            <X className="h-3.5 w-3.5" />
            解除
          </button>
        </div>
      )}

      {/* タスク作成ダイアログ */}
      <TaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        task={null}
        defaultGroupId={createGroupId}
        parentTaskId={createParentId}
        users={users}
        groups={initialGroups}
        workspaceId={workspaceId}
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
        workspaceId={workspaceId}
      />
    </>
  );
}

// TaskRowのインポート（循環参照を避けるため末尾に）
import TaskRow from "@/components/TaskRow";
