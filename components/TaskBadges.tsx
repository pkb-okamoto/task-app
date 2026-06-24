import { Badge } from "@/components/ui/badge";
import { type Priority, type GroupColor } from "@/lib/types";

// 優先度バッジ（色分け・絵文字付き）
export function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    緊急: "bg-red-100 text-red-700 border-red-200",
    高: "bg-orange-100 text-orange-700 border-orange-200",
    中: "bg-yellow-100 text-yellow-700 border-yellow-200",
    低: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const emoji: Record<Priority, string> = {
    緊急: "🔥",
    高: "⬆️",
    中: "➡️",
    低: "⬇️",
  };

  return (
    <Badge variant="outline" className={`text-xs font-medium ${styles[priority]}`}>
      {emoji[priority]} {priority}
    </Badge>
  );
}

// グループカラーに対応したスタイル
export const groupColorStyles: Record<GroupColor, { dot: string; text: string; bg: string; badge: string }> = {
  gray:   { dot: "bg-gray-400",   text: "text-gray-700",   bg: "bg-gray-50",   badge: "bg-gray-100 text-gray-600 border-gray-200"   },
  blue:   { dot: "bg-blue-500",   text: "text-blue-700",   bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700 border-blue-200"    },
  green:  { dot: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50",  badge: "bg-green-100 text-green-700 border-green-200"  },
  red:    { dot: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50",    badge: "bg-red-100 text-red-700 border-red-200"        },
  yellow: { dot: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-700 border-yellow-200"},
  purple: { dot: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-700 border-purple-200"},
  orange: { dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700 border-orange-200"},
};

// グループバッジ
export function GroupBadge({ name, color }: { name: string; color: GroupColor }) {
  const style = groupColorStyles[color] ?? groupColorStyles.gray;
  return (
    <Badge variant="outline" className={`text-xs font-medium ${style.badge}`}>
      {name}
    </Badge>
  );
}
