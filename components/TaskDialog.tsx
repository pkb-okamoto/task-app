"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createTask, updateTask, setTaskAssignees } from "@/lib/actions/tasks";
import { getUserSettings } from "@/lib/actions/settings";
import { useWorkspace } from "@/lib/workspace-context";
import TaskAttachments from "@/components/TaskAttachments";
import { type Group, type Priority, type Task, type User } from "@/lib/types";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultGroupId?: string | null;
  parentTaskId?: string | null;
  users: User[];
  groups: Group[];
}

// 時刻の選択肢（30分刻み）
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return { value: `${h}:${m}`, label: `${h}:${m}` };
});

// アラート日数の選択肢
const ALERT_OPTIONS = [
  { value: "none", label: "通知しない" },
  { value: "0",    label: "当日" },
  { value: "1",    label: "1日前" },
  { value: "2",    label: "2日前" },
  { value: "3",    label: "3日前" },
  { value: "5",    label: "5日前" },
  { value: "7",    label: "7日前" },
  { value: "14",   label: "14日前" },
];

// タスク作成・編集ダイアログ
export default function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultGroupId = null,
  parentTaskId = null,
  users,
  groups,
}: TaskDialogProps) {
  const isEdit = !!task;
  const [isPending, startTransition] = useTransition();
  const { refresh } = useWorkspace();

  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<Priority>("中");
  const [alertDays, setAlertDays] = useState<string>("none");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // 新規作成時はユーザーのデフォルト優先度を適用
  useEffect(() => {
    if (!task && open) {
      startTransition(async () => {
        const s = await getUserSettings();
        if (s?.default_priority) setPriority(s.default_priority as Priority);
      });
    }
  }, [open, task]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setGroupId(task.group_id ?? null);
      setDueDate(task.due_date ?? "");
      setDueTime(task.due_time ?? "");
      setProgress(task.progress);
      setNotes(task.notes ?? "");
      setPriority(task.priority);
      setAlertDays(task.alert_days != null ? String(task.alert_days) : "none");
      setSelectedUserIds(task.assignees?.map((u) => u.id) ?? []);
    } else {
      setTitle("");
      setGroupId(defaultGroupId ?? groups[0]?.id ?? null);
      setDueDate("");
      setDueTime("");
      setProgress(0);
      setNotes("");
      setPriority("中");
      setAlertDays("none");
      setSelectedUserIds([]);
    }
  }, [task, defaultGroupId, groups, open]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const selectedGroup = groups.find((g) => g.id === groupId);
    const alertDaysValue = alertDays === "none" ? null : Number(alertDays);

    startTransition(async () => {
      if (isEdit && task) {
        await updateTask(task.id, {
          title: title.trim(),
          group_id: groupId,
          group_status: selectedGroup?.name ?? "",
          due_date: dueDate || null,
          due_time: dueTime || null,
          progress,
          notes: notes.trim() || null,
          priority,
          alert_days: alertDaysValue,
        });
        await setTaskAssignees(task.id, selectedUserIds);
      } else {
        const newTaskId = await createTask({
          title: title.trim(),
          group_id: groupId,
          group_status: selectedGroup?.name ?? "",
          due_date: dueDate || null,
          due_time: dueTime || null,
          progress,
          notes: notes.trim() || null,
          priority,
          alert_days: alertDaysValue,
          parent_task_id: parentTaskId,
        });
        if (newTaskId && selectedUserIds.length > 0) {
          await setTaskAssignees(newTaskId, selectedUserIds);
        }
      }
      onOpenChange(false);
      refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "タスクを編集" : "タスクを追加"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* タスク名 */}
          <div className="grid gap-1.5">
            <Label htmlFor="title">タスク名 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスク名を入力"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* グループ */}
            <div className="grid gap-1.5">
              <Label>グループ</Label>
              <Select value={groupId ?? ""} onValueChange={(v) => setGroupId(v || null)}>
                <SelectTrigger>
                  <SelectValue>
                    {groups.find((g) => g.id === groupId)?.name ?? "グループを選択"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 優先度 */}
            <div className="grid gap-1.5">
              <Label>優先度</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="緊急">🔥 緊急</SelectItem>
                  <SelectItem value="高">⬆️ 高</SelectItem>
                  <SelectItem value="中">➡️ 中</SelectItem>
                  <SelectItem value="低">⬇️ 低</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 期限（日付） */}
            <div className="grid gap-1.5">
              <Label htmlFor="due_date">期限</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); if (!e.target.value) setDueTime(""); }}
              />
            </div>

            {/* 期限（時刻） */}
            <div className="grid gap-1.5">
              <Label>時刻</Label>
              <Select
                value={dueTime || "none"}
                onValueChange={(v) => setDueTime(v === "none" ? "" : (v ?? ""))}
                disabled={!dueDate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="指定なし" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">指定なし</SelectItem>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* アラート設定 */}
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-gray-500" />
                アラート
              </Label>
              <Select value={alertDays} onValueChange={(v) => setAlertDays(v ?? "none")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 進捗率 */}
          <div className="grid gap-1.5">
            <Label htmlFor="progress">進捗率: {progress}%</Label>
            <input
              id="progress"
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          {/* 備考 */}
          <div className="grid gap-1.5">
            <Label htmlFor="notes">備考（URLも可）</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="メモやリンクを入力"
              rows={2}
            />
          </div>

          {/* 担当者 */}
          {users.length > 0 && (
            <div className="grid gap-1.5">
              <Label>担当者</Label>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md hover:bg-gray-100"
                  >
                    <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatar_url ?? ""} alt={user.name} />
                      <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {/* 添付ファイル（編集時のみ表示） */}
          {isEdit && task && (
            <div className="grid gap-1.5">
              <Label>添付ファイル</Label>
              <TaskAttachments taskId={task.id} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isPending || !title.trim()}>
            {isPending ? "保存中..." : isEdit ? "更新" : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
