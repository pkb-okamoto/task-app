import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ユーザーのOAuth2クライアントを取得（adminクライアントでRLSをバイパス）
async function getOAuth2Client(userId: string) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return null;

  const admin = getAdminClient();
  const { data } = await admin
    .from("user_google_tokens")
    .select("access_token, refresh_token, expiry_date")
    .eq("user_id", userId)
    .single();

  if (!data?.refresh_token) return null;

  const { google } = await import("googleapis");
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: data.expiry_date,
  });

  // トークンが更新されたらDBに保存（adminクライアントでRLSをバイパス）
  oauth2Client.on("tokens", async (tokens) => {
    const admin = getAdminClient();
    await admin.from("user_google_tokens").update({
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
    }).eq("user_id", userId);
  });

  return oauth2Client;
}

// タスクをGoogleカレンダーに追加・更新
export async function upsertCalendarEvent(
  userId: string,
  task: { id: string; title: string; due_date: string; due_time?: string | null; notes?: string | null }
) {
  const auth = await getOAuth2Client(userId);
  if (!auth) {
    console.log("[Calendar] OAuthクライアント取得失敗 - 未連携またはトークンなし userId:", userId);
    return null;
  }
  console.log("[Calendar] upsertCalendarEvent 開始 taskId:", task.id, "title:", task.title);

  const { google } = await import("googleapis");
  const calendar = google.calendar({ version: "v3", auth });
  const supabase = await createClient();

  // 既存のカレンダーイベントIDを確認
  const { data: existing } = await supabase
    .from("task_calendar_events")
    .select("event_id")
    .eq("task_id", task.id)
    .eq("user_id", userId)
    .single();

  // 時刻指定ありは dateTime、なしは date（終日）
  const eventBody = task.due_time
    ? {
        summary: task.title,
        description: task.notes ?? "",
        start: { dateTime: `${task.due_date}T${task.due_time}:00`, timeZone: "Asia/Tokyo" },
        end: { dateTime: `${task.due_date}T${task.due_time}:00`, timeZone: "Asia/Tokyo" },
      }
    : {
        summary: task.title,
        description: task.notes ?? "",
        start: { date: task.due_date },
        end: { date: task.due_date },
      };

  if (existing?.event_id) {
    // 既存イベントを更新
    await calendar.events.update({
      calendarId: "primary",
      eventId: existing.event_id,
      requestBody: eventBody,
    });
    console.log("[Calendar] イベント更新成功 eventId:", existing.event_id);
  } else {
    // 新規イベントを作成
    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: eventBody,
    });

    if (res.data.id) {
      const { error } = await supabase.from("task_calendar_events").insert({
        task_id: task.id,
        user_id: userId,
        event_id: res.data.id,
      });
      if (error) {
        console.error("[Calendar] task_calendar_events 保存失敗:", error.message);
      } else {
        console.log("[Calendar] イベント作成・保存成功 eventId:", res.data.id);
      }
    }
  }
}

// タスクのカレンダーイベントを削除
export async function deleteCalendarEvent(userId: string, taskId: string) {
  const auth = await getOAuth2Client(userId);
  if (!auth) {
    console.log("[Calendar] 削除スキップ - 未連携 userId:", userId);
    return;
  }
  console.log("[Calendar] deleteCalendarEvent 開始 taskId:", taskId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("task_calendar_events")
    .select("event_id")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .single();

  if (!data?.event_id) {
    console.log("[Calendar] task_calendar_events にレコードなし taskId:", taskId);
    return;
  }
  console.log("[Calendar] 削除対象 eventId:", data.event_id);

  const { google } = await import("googleapis");
  const calendar = google.calendar({ version: "v3", auth });
  try {
    await calendar.events.delete({ calendarId: "primary", eventId: data.event_id });
  } catch {
    // イベントが既に削除されていても無視
  }

  await supabase.from("task_calendar_events").delete()
    .eq("task_id", taskId).eq("user_id", userId);
}

// Googleカレンダーのイベント一覧を取得（今月〜来月）
export async function getCalendarEvents(userId: string) {
  const auth = await getOAuth2Client(userId);
  if (!auth) return [];

  const { google } = await import("googleapis");
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });

  return res.data.items ?? [];
}
