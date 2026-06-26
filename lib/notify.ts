// ブラウザ通知を発行するユーティリティ

export function sendBrowserNotification(title: string, body: string, tag?: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  new Notification(title, {
    body,
    icon: "/favicon.ico",
    tag,
  });
}
