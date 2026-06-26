"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, CheckCircle2, Clock, ListTodo } from "lucide-react";
import { type Group, type Task, type User } from "@/lib/types";

interface DashboardProps {
  tasks: Task[];
  groups: Group[];
  users: User[];
}

const PRIORITY_COLORS: Record<string, string> = {
  緊急: "#ef4444",
  高: "#f97316",
  中: "#3b82f6",
  低: "#6b7280",
};

const PROGRESS_COLORS = ["#6b7280", "#3b82f6", "#22c55e"];

export default function Dashboard({ tasks, groups, users }: DashboardProps) {
  const rootTasks = tasks.filter((t) => !t.parent_task_id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = useMemo(() => {
    const total = rootTasks.length;
    const completed = rootTasks.filter((t) => t.progress === 100).length;
    const overdue = rootTasks.filter((t) => {
      if (!t.due_date || t.progress === 100) return false;
      const due = new Date(t.due_date);
      due.setHours(0, 0, 0, 0);
      return due < today;
    }).length;
    const inProgress = rootTasks.filter((t) => t.progress > 0 && t.progress < 100).length;
    return { total, completed, overdue, inProgress };
  }, [rootTasks]);

  // 優先度別タスク数
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = { 緊急: 0, 高: 0, 中: 0, 低: 0 };
    rootTasks.forEach((t) => { counts[t.priority] = (counts[t.priority] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rootTasks]);

  // 進捗状態別タスク数
  const progressData = useMemo(() => [
    { name: "未着手", value: rootTasks.filter((t) => t.progress === 0).length },
    { name: "進行中", value: rootTasks.filter((t) => t.progress > 0 && t.progress < 100).length },
    { name: "完了", value: rootTasks.filter((t) => t.progress === 100).length },
  ], [rootTasks]);

  // グループ別タスク数
  const groupData = useMemo(() => groups.map((g) => ({
    name: g.name,
    total: rootTasks.filter((t) => t.group_id === g.id).length,
    完了: rootTasks.filter((t) => t.group_id === g.id && t.progress === 100).length,
  })), [rootTasks, groups]);

  // 担当者別タスク数
  const userStats = useMemo(() => users.map((u) => {
    const assigned = rootTasks.filter((t) => t.assignees?.some((a) => a.id === u.id));
    return {
      user: u,
      total: assigned.length,
      completed: assigned.filter((t) => t.progress === 100).length,
      overdue: assigned.filter((t) => {
        if (!t.due_date || t.progress === 100) return false;
        const due = new Date(t.due_date);
        due.setHours(0, 0, 0, 0);
        return due < today;
      }).length,
    };
  }).filter((s) => s.total > 0), [rootTasks, users]);

  // 期限が近いタスク（7日以内、未完了）
  const upcomingTasks = useMemo(() => rootTasks
    .filter((t) => {
      if (!t.due_date || t.progress === 100) return false;
      const due = new Date(t.due_date);
      due.setHours(0, 0, 0, 0);
      const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    })
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 8),
  [rootTasks]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });

  return (
    <div className="flex-1 overflow-auto px-6 py-5 bg-gray-50">
      <h1 className="text-lg font-bold text-gray-900 mb-5">ダッシュボード</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "総タスク数", value: stats.total, icon: <ListTodo className="h-5 w-5 text-blue-500" />, color: "text-blue-600" },
          { label: "進行中", value: stats.inProgress, icon: <Clock className="h-5 w-5 text-yellow-500" />, color: "text-yellow-600" },
          { label: "完了", value: stats.completed, icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, color: "text-green-600" },
          { label: "期限超過", value: stats.overdue, icon: <AlertCircle className="h-5 w-5 text-red-500" />, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="p-2 bg-gray-50 rounded-lg">{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* 優先度別 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">優先度別タスク数</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={priorityData} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={24} />
              <Tooltip />
              <Bar dataKey="value" name="件数" radius={[4, 4, 0, 0]}>
                {priorityData.map((entry) => (
                  <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] ?? "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 進捗状態別 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">進捗状態</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={progressData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" label={({ name, value }) => value > 0 ? `${name} ${value}` : ""} labelLine={false} fontSize={11}>
                {progressData.map((_, i) => (
                  <Cell key={i} fill={PROGRESS_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* グループ別 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">グループ別タスク数</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={groupData} barSize={20} layout="vertical">
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="total" name="全体" fill="#93c5fd" radius={[0, 4, 4, 0]} />
              <Bar dataKey="完了" name="完了" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 期限が近いタスク */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">期限が近いタスク（7日以内）</p>
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">該当タスクなし</p>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((t) => {
                const due = new Date(t.due_date!);
                due.setHours(0, 0, 0, 0);
                const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${diff === 0 ? "bg-red-100 text-red-600" : diff === 1 ? "bg-yellow-100 text-yellow-700" : "bg-blue-50 text-blue-600"}`}>
                      {diff === 0 ? "本日" : diff === 1 ? "明日" : `${diff}日後`}
                    </span>
                    <span className="text-sm text-gray-700 flex-1 truncate">{t.title}</span>
                    <span className="text-xs text-gray-400 shrink-0">{formatDate(t.due_date!)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 担当者別サマリー */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">担当者別サマリー</p>
          {userStats.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">担当者未設定</p>
          ) : (
            <div className="space-y-3">
              {userStats.map((s) => (
                <div key={s.user.id} className="flex items-center gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={s.user.avatar_url ?? ""} />
                    <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">{s.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-gray-700 truncate">{s.user.name}</span>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{s.completed}/{s.total}件完了</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: s.total > 0 ? `${(s.completed / s.total) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                  {s.overdue > 0 && (
                    <span className="text-xs text-red-500 shrink-0">{s.overdue}件超過</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
