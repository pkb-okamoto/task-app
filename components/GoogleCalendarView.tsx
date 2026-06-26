"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, ExternalLink } from "lucide-react";

interface CalendarEvent {
  id: string;
  summary?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  htmlLink?: string;
}

// Googleカレンダーのイベント一覧を表示するパネル
export default function GoogleCalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    fetch("/api/calendar/events")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setConnected(false);
        } else {
          setEvents(data.events ?? []);
        }
      })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (event: CalendarEvent) => {
    const dateStr = event.start?.date ?? event.start?.dateTime;
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">カレンダーを読み込み中...</span>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-gray-500">
        <CalendarDays className="h-10 w-10 text-gray-300" />
        <p className="text-sm">Googleカレンダーが連携されていません</p>
        <a
          href="/api/auth/google"
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Googleカレンダーと連携する
        </a>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <CalendarDays className="h-10 w-10 text-gray-200 mb-2" />
        <p className="text-sm">この期間の予定はありません</p>
      </div>
    );
  }

  // 日付ごとにグループ化
  const grouped = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const key = event.start?.date ?? event.start?.dateTime?.split("T")[0] ?? "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-4 p-4">
      {Object.entries(grouped).map(([date, dayEvents]) => (
        <div key={date}>
          <div className="text-xs font-semibold text-gray-400 uppercase mb-1.5 px-1">
            {new Date(date).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
          </div>
          <div className="space-y-1">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-sm text-gray-800">{event.summary ?? "(タイトルなし)"}</span>
                </div>
                {event.htmlLink && (
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
