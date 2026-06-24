import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

// 期限まで何日かを計算
function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// 期限ラベルを生成
function dueDateLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}日超過`;
  if (days === 0) return "今日が期限";
  return `あと${days}日`;
}

// メール本文HTMLを生成
function buildEmailHtml(tasks: { title: string; due_date: string; group_status: string; priority: string }[]) {
  const rows = tasks
    .map((t) => {
      const days = daysUntil(t.due_date);
      const label = dueDateLabel(days);
      const color = days < 0 ? "#dc2626" : days === 0 ? "#ea580c" : "#2563eb";
      return `
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 12px;font-size:14px;color:#111827;">${t.title}</td>
          <td style="padding:10px 12px;font-size:14px;color:${color};font-weight:600;">${label}</td>
          <td style="padding:10px 12px;font-size:14px;color:#6b7280;">${t.group_status}</td>
          <td style="padding:10px 12px;font-size:14px;color:#6b7280;">${t.priority}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#1e40af;margin-bottom:4px;">📋 TaskBoard タスクリマインダー</h2>
      <p style="color:#6b7280;font-size:14px;margin-bottom:20px;">期限が近いタスクのお知らせです。</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;">タスク名</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;">期限</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;">ステータス</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;">優先度</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#9ca3af;font-size:12px;margin-top:20px;">
        このメールはTaskBoardから自動送信されています。
      </p>
    </div>
  `;
}

// POST /api/notify
// Supabase Cron（またはテスト）から呼び出されるメール送信エンドポイント
export async function POST(request: Request) {
  // 簡易認証：Cronからの呼び出しかを確認
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // 期限3日以内（超過含む）の未完了タスクを担当者のメールアドレスと一緒に取得
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(`
      id, title, due_date, group_status, priority,
      task_assignees(
        user:users(id, name),
        auth_user:user_id
      )
    `)
    .neq("group_status", "完了")
    .not("due_date", "is", null)
    .lte("due_date", new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ message: "通知対象タスクなし" });
  }

  // 担当者ごとにタスクをグループ化
  const userTaskMap = new Map<string, { email: string; name: string; tasks: typeof tasks }>();

  for (const task of tasks) {
    for (const assignee of task.task_assignees ?? []) {
      const userId = assignee.auth_user as string;

      // auth.usersからメールアドレスを取得
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (!authUser?.user?.email) continue;

      const email = authUser.user.email;
      const name = (assignee.user as unknown as { name: string })?.name ?? email;

      if (!userTaskMap.has(userId)) {
        userTaskMap.set(userId, { email, name, tasks: [] });
      }
      userTaskMap.get(userId)!.tasks.push(task);
    }
  }

  // 各担当者にメール送信
  const results = await Promise.allSettled(
    Array.from(userTaskMap.values()).map(({ email, name, tasks: userTasks }) =>
      resend.emails.send({
        from: "TaskBoard <onboarding@resend.dev>",
        to: email,
        subject: `【TaskBoard】期限が近いタスクが${userTasks.length}件あります`,
        html: buildEmailHtml(
          userTasks.map((t) => ({
            title: t.title,
            due_date: t.due_date!,
            group_status: t.group_status,
            priority: t.priority,
          }))
        ),
      })
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ succeeded, failed });
}
