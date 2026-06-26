"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNotifications, markAllAsRead, markAsRead, type Notification } from "@/lib/actions/notifications";
import { type User } from "@/lib/types";

interface NotificationPopoverProps {
  currentUser: User | null;
}

export default function NotificationPopover({ currentUser }: NotificationPopoverProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const load = () => {
    startTransition(async () => {
      const data = await getNotifications();
      setNotifications(data);
    });
  };

  useEffect(() => {
    if (!currentUser) return;
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [currentUser]);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    if (!open) load();
    setOpen((v) => !v);
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    });
  };

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      await markAsRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return "たった今";
    if (diffMin < 60) return `${diffMin}分前`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}時間前`;
    return `${Math.floor(diffH / 24)}日前`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative p-2 rounded-md hover:bg-gray-100 transition-colors text-gray-500"
        onClick={handleToggle}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">通知</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-blue-600 gap-1 px-2"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                すべて既読
              </Button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">通知はありません</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${n.is_read ? "opacity-60" : ""}`}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                >
                  <div className="shrink-0 mt-1.5">
                    <div className={`h-2 w-2 rounded-full ${n.is_read ? "bg-gray-300" : "bg-blue-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatTime(n.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
