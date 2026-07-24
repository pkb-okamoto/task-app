"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { type User } from "@/lib/types";

interface BrowserNotificationProps {
  currentUser: User | null;
}

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function notify(title: string, body: string, tag?: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/favicon.ico", tag });
}

// 起動時の期限アラート＋リアルタイムのタスク割り当て通知
export default function BrowserNotification({ currentUser }: BrowserNotificationProps) {
  useEffect(() => {
    if (!currentUser) return;
    if (!("Notification" in window)) return;

    const supabase = createClient();

    const init = async () => {
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return;

      // ① 起動時：各タスクの alert_days 設定に基づいてリマインド
      const { data: assignees } = await supabase
        .from("task_assignees")
        .select("task:tasks(id, title, due_date, group_status, priority, alert_days)")
        .eq("user_id", currentUser.id);

      if (assignees) {
        const today = new Date().toISOString().split("T")[0];
        const storageKey = `notified_${today}`;
        const notifiedIds: string[] = JSON.parse(localStorage.getItem(storageKey) ?? "[]");

        const tasks = assignees
          .map((a) => a.task as unknown as {
            id: string;
            title: string;
            due_date: string | null;
            group_status: string;
            priority: string;
            alert_days: number | null;
          } | null)
          .filter((t): t is NonNullable<typeof t> =>
            t !== null &&
            t.due_date !== null &&
            t.group_status !== "完了" &&
            !notifiedIds.includes(t.id)
          );

        for (const task of tasks) {
          const days = daysUntil(task.due_date!);

          // alert_days が設定されている場合はその日数以下になったら通知（期限超過も含む）
          // 設定がない場合は3日以内をデフォルト通知
          const shouldNotify = task.alert_days != null
            ? days <= task.alert_days
            : days >= -7 && days <= 3;

          if (!shouldNotify) continue;

          const body = days < 0
            ? `期限を${Math.abs(days)}日超過しています`
            : days === 0 ? "今日が期限です"
            : `期限まであと${days}日です`;

          notify(`📋 ${task.title}`, body, task.id);
        }

        const notified = tasks.filter((t) => {
          const days = daysUntil(t.due_date!);
          return t.alert_days != null ? days <= t.alert_days : days >= -7 && days <= 3;
        }).map((t) => t.id);

        if (notified.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify([...notifiedIds, ...notified]));
        }

        // 古いキーを削除
        Object.keys(localStorage)
          .filter((k) => k.startsWith("notified_") && k !== storageKey)
          .forEach((k) => localStorage.removeItem(k));
      }

      // ② リアルタイム：自分がタスクに割り当てられたら即通知
      const channel = supabase
        .channel("task-assignees-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "task_assignees",
            filter: `user_id=eq.${currentUser.id}`,
          },
          async (payload) => {
            const taskId = payload.new.task_id as string;
            const { data: task } = await supabase
              .from("tasks")
              .select("id, title, priority, due_date")
              .eq("id", taskId)
              .single();

            if (!task) return;

            const dueText = task.due_date
              ? `　期限：${new Date(task.due_date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}`
              : "";

            notify(
              `📌 タスクが割り当てられました`,
              `${task.title}${dueText}`,
              `assigned_${task.id}`
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    let cleanup: (() => void) | undefined;
    const timer = setTimeout(async () => {
      cleanup = await init() ?? undefined;
    }, 1500);

    return () => {
      clearTimeout(timer);
      cleanup?.();
    };
  }, [currentUser]);

  return null;
}
