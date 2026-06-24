"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { type User } from "@/lib/types";

interface BrowserNotificationProps {
  currentUser: User | null;
}

// 期限まで何日かを計算
function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// アプリ起動時に期限が近いタスクをブラウザ通知で知らせるコンポーネント
export default function BrowserNotification({ currentUser }: BrowserNotificationProps) {
  useEffect(() => {
    if (!currentUser) return;

    // ブラウザ通知がサポートされているか確認
    if (!("Notification" in window)) return;

    const checkAndNotify = async () => {
      // 通知許可を要求
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return;

      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // 自分が担当している期限3日以内の未完了タスクを取得
      const { data: assignees } = await supabase
        .from("task_assignees")
        .select(`
          task:tasks(id, title, due_date, group_status, priority)
        `)
        .eq("user_id", currentUser.id);

      if (!assignees) return;

      const tasks = assignees
        .map((a) => a.task as unknown as { id: string; title: string; due_date: string | null; group_status: string; priority: string } | null)
        .filter((t): t is NonNullable<typeof t> =>
          t !== null &&
          t.due_date !== null &&
          t.group_status !== "完了" &&
          t.due_date <= threeDaysLater
        );

      if (tasks.length === 0) return;

      // 当日すでに通知済みのタスクIDをlocalStorageで確認
      const storageKey = `notified_${today}`;
      const notifiedIds: string[] = JSON.parse(localStorage.getItem(storageKey) ?? "[]");

      const unnotified = tasks.filter((t) => !notifiedIds.includes(t.id));
      if (unnotified.length === 0) return;

      // タスクごとに通知を発行
      for (const task of unnotified) {
        const days = daysUntil(task.due_date!);
        let body = "";
        if (days < 0) body = `期限を${Math.abs(days)}日超過しています`;
        else if (days === 0) body = "今日が期限です";
        else body = `期限まであと${days}日です`;

        new Notification(`📋 ${task.title}`, {
          body,
          icon: "/favicon.ico",
          tag: task.id, // 同じタスクの重複通知を防ぐ
        });
      }

      // 通知済みIDを保存（翌日に自動リセット）
      const newNotifiedIds = [...notifiedIds, ...unnotified.map((t) => t.id)];
      localStorage.setItem(storageKey, JSON.stringify(newNotifiedIds));

      // 前日以前のlocalStorageキーを削除
      Object.keys(localStorage)
        .filter((k) => k.startsWith("notified_") && k !== storageKey)
        .forEach((k) => localStorage.removeItem(k));
    };

    // 少し遅延してから通知チェック（ページ読み込み完了後）
    const timer = setTimeout(checkAndNotify, 2000);
    return () => clearTimeout(timer);
  }, [currentUser]);

  // 描画なし（通知のみ）
  return null;
}
