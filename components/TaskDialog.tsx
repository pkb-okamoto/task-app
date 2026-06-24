"use client";

import { useEffect, useState, useTransition } from "react";
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
import { type GroupStatus, type Priority, type Task, type User } from "@/lib/types";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;           // nullなら新規作成モード
  defaultStatus?: GroupStatus;  // 新規作成時のデフォルトステータス
  parentTaskId?: string | null; // サブタスク追加時の親ID
  users: User[];                // 担当者候補一覧
}

// タスク作成・編集ダイアログ
export default function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStatus = "未着手",
  parentTaskId = null,
  users,
}: TaskDialogProps) {
  const isEdit = !!task;
  const [isPending, startTransition] = useTransition();

  // フォーム状態
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<GroupStatus>(defaultStatus);
  const [dueDate, setDueDate] = useState("");
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<Priority>("中");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // 編集時は既存データをフォームに反映
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStatus(task.group_status);
      setDueDate(task.due_date ?? "");
      setProgress(task.progress);
      setNotes(task.notes ?? "");
      setPriority(task.priority);
      setSelectedUserIds(task.assignees?.map((u) => u.id) ?? []);
    } else {
      setTitle("");
      setStatus(defaultStatus);
      setDueDate("");
      setProgress(0);
      setNotes("");
      setPriority("中");
      setSelectedUserIds([]);
    }
  }, [task, defaultStatus, open]);

  // 担当者のチェック切り替え
  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // 保存処理
  const handleSave = () => {
    if (!title.trim()) return;

    startTransition(async () => {
      if (isEdit && task) {
        // 更新
        await updateTask(task.id, {
          title: title.trim(),
          group_status: status,
          due_date: dueDate || null,
          progress,
          notes: notes.trim() || null,
          priority,
        });
        await setTaskAssignees(task.id, selectedUserIds);
      } else {
        // 新規作成（IDを取得するためinsert後にselectが必要だが、簡略化のため担当者は別途対応）
        await createTask({
          title: title.trim(),
          group_status: status,
          due_date: dueDate || null,
          progress,
          notes: notes.trim() || null,
          priority,
          parent_task_id: parentTaskId,
        });
      }
      onOpenChange(false);
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
            {/* ステータス */}
            <div className="grid gap-1.5">
              <Label>ステータス</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as GroupStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="未着手">未着手</SelectItem>
                  <SelectItem value="進行中">進行中</SelectItem>
                  <SelectItem value="完了">完了</SelectItem>
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
                  <SelectItem value="緊急">緊急</SelectItem>
                  <SelectItem value="高">高</SelectItem>
                  <SelectItem value="中">中</SelectItem>
                  <SelectItem value="低">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 期限 */}
            <div className="grid gap-1.5">
              <Label htmlFor="due_date">期限</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
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

          {/* 担当者（編集時のみ） */}
          {isEdit && users.length > 0 && (
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
