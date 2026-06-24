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
import { createGroup, updateGroup } from "@/lib/actions/groups";
import { type Group, type GroupColor } from "@/lib/types";

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: Group | null;
}

// 色の選択肢
const COLOR_OPTIONS: { value: GroupColor; label: string; bg: string; dot: string }[] = [
  { value: "gray",   label: "グレー",   bg: "bg-gray-100",   dot: "bg-gray-400"   },
  { value: "blue",   label: "ブルー",   bg: "bg-blue-100",   dot: "bg-blue-500"   },
  { value: "green",  label: "グリーン", bg: "bg-green-100",  dot: "bg-green-500"  },
  { value: "red",    label: "レッド",   bg: "bg-red-100",    dot: "bg-red-500"    },
  { value: "yellow", label: "イエロー", bg: "bg-yellow-100", dot: "bg-yellow-500" },
  { value: "purple", label: "パープル", bg: "bg-purple-100", dot: "bg-purple-500" },
  { value: "orange", label: "オレンジ", bg: "bg-orange-100", dot: "bg-orange-500" },
];

// グループ追加・編集ダイアログ
export default function GroupDialog({ open, onOpenChange, group }: GroupDialogProps) {
  const isEdit = !!group;
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [color, setColor] = useState<GroupColor>("gray");

  useEffect(() => {
    if (group) {
      setName(group.name);
      setColor(group.color);
    } else {
      setName("");
      setColor("gray");
    }
  }, [group, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      if (isEdit && group) {
        await updateGroup(group.id, { name: name.trim(), color });
      } else {
        await createGroup({ name: name.trim(), color });
      }
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "グループを編集" : "グループを追加"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* グループ名 */}
          <div className="grid gap-1.5">
            <Label htmlFor="group-name">グループ名 *</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：レビュー中"
              autoFocus
            />
          </div>

          {/* 色選択 */}
          <div className="grid gap-1.5">
            <Label>色</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border-2 transition-all ${
                    color === c.value
                      ? "border-gray-800 " + c.bg
                      : "border-transparent " + c.bg
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? "保存中..." : isEdit ? "更新" : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
