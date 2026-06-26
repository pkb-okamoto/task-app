"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, Bell, ListTodo } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserSettings, updateUserSettings, exportTasksCSV, type UserSettings } from "@/lib/actions/settings";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITIES = ["緊急", "高", "中", "低"] as const;

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const s = await getUserSettings();
      setSettings(s);
    });
  }, [open]);

  const handleChange = (key: keyof Omit<UserSettings, "user_id">, value: boolean | string | null) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    startTransition(async () => {
      await updateUserSettings({ [key]: value });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleExport = () => {
    startTransition(async () => {
      const csv = await exportTasksCSV();
      if (!csv) return;
      const bom = "﻿";
      const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            設定
            {saved && <span className="text-xs text-green-600 font-normal">保存しました</span>}
          </DialogTitle>
        </DialogHeader>

        {!settings ? (
          <div className="py-8 text-center text-sm text-gray-400">読み込み中…</div>
        ) : (
          <div className="space-y-6 py-2">
            {/* 通知設定 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">通知</span>
              </div>
              <div className="flex items-center justify-between px-1">
                <Label htmlFor="mention-notify" className="text-sm text-gray-600 cursor-pointer">
                  メンション通知（@名前）
                </Label>
                <Switch
                  id="mention-notify"
                  checked={settings.mention_notify}
                  onCheckedChange={(v) => handleChange("mention_notify", v)}
                />
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* タスクデフォルト設定 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ListTodo className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">タスクのデフォルト値</span>
              </div>
              <div className="flex items-center justify-between px-1">
                <Label className="text-sm text-gray-600">新規タスクの優先度</Label>
                <Select
                  value={settings.default_priority}
                  onValueChange={(v) => handleChange("default_priority", v)}
                >
                  <SelectTrigger className="w-24 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* データエクスポート */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Download className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">データ</span>
              </div>
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-sm text-gray-600">タスク一覧をCSVで出力</p>
                  <p className="text-xs text-gray-400">期限・担当者・進捗を含む</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  エクスポート
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
