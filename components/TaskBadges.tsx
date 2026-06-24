import { Badge } from "@/components/ui/badge";
import { type Priority, type GroupStatus } from "@/lib/types";

// 優先度バッジ（色分け）
export function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    緊急: "bg-red-100 text-red-700 border-red-200",
    高: "bg-orange-100 text-orange-700 border-orange-200",
    中: "bg-yellow-100 text-yellow-700 border-yellow-200",
    低: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <Badge variant="outline" className={`text-xs font-medium ${styles[priority]}`}>
      {priority}
    </Badge>
  );
}

// ステータスバッジ（色分け）
export function StatusBadge({ status }: { status: GroupStatus }) {
  const styles: Record<GroupStatus, string> = {
    未着手: "bg-gray-100 text-gray-600 border-gray-200",
    進行中: "bg-blue-100 text-blue-700 border-blue-200",
    完了: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <Badge variant="outline" className={`text-xs font-medium ${styles[status]}`}>
      {status}
    </Badge>
  );
}
