"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteTask } from "@/lib/actions/tasks";
import { useWorkspace } from "@/lib/workspace-context";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

// タスク削除確認ダイアログ
export default function DeleteDialog({
  open,
  onOpenChange,
  taskId,
  taskTitle,
}: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { refresh } = useWorkspace();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteTask(taskId);
        onOpenChange(false);
        refresh();
      } catch (e) {
        alert("削除に失敗しました。もう一度お試しください。");
        console.error(e);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>タスクを削除</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          「<span className="font-medium text-gray-900">{taskTitle}</span>」を削除しますか？
          <br />
          サブタスクもすべて削除されます。この操作は取り消せません。
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "削除中..." : "削除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
