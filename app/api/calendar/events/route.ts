import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCalendarEvents } from "@/lib/google-calendar";

// GET /api/calendar/events
// ログイン中ユーザーのGoogleカレンダーイベントを取得
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await getCalendarEvents(user.id);
  return NextResponse.json({ events });
}
