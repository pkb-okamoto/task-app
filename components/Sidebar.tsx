"use client";

import { useState, useTransition } from "react";
import {
  BarChart2,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Home,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Table2,
  Trash2,
} from "lucide-react";
import { createWorkspace, deleteWorkspace } from "@/lib/actions/workspaces";
import { type Workspace } from "@/lib/types";

interface SidebarProps {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  onSwitch: (workspaceId: string) => void;
  onManage: (workspace: Workspace) => void;
  view?: "board" | "dashboard" | "calendar";
  onViewChange?: (view: "board" | "dashboard" | "calendar") => void;
}

// monday.com風の左サイドバー
export default function Sidebar({
  workspaces,
  currentWorkspaceId,
  onSwitch,
  onManage,
  view = "board",
  onViewChange,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [contentOpen, setContentOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const ws = await createWorkspace(trimmed);
      setNewName("");
      setCreating(false);
      onSwitch(ws.id);
    });
  };

  const handleDelete = (ws: Workspace) => {
    setMenuOpenId(null);
    if (!confirm(`「${ws.name}」を削除しますか？`)) return;
    startTransition(async () => {
      await deleteWorkspace(ws.id);
      const remaining = workspaces.filter((w) => w.id !== ws.id);
      if (remaining.length > 0) onSwitch(remaining[0].id);
    });
  };

  // 折りたたみ時はアイコンのみ表示
  if (collapsed) {
    return (
      <aside className="w-12 flex flex-col items-center py-3 gap-3 bg-gray-50 border-r border-gray-200 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-500"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => onSwitch(ws.id)}
            className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
              ws.id === currentWorkspaceId
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            title={ws.name}
          >
            {ws.name.charAt(0)}
          </button>
        ))}
      </aside>
    );
  }

  return (
    <aside className="w-60 flex flex-col bg-gray-50 border-r border-gray-200 shrink-0 overflow-y-auto overflow-x-hidden">
      {/* ヘッダー部分 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          ワークスペース
        </span>
        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded hover:bg-gray-200 text-gray-500"
            onClick={() => currentWorkspace && onManage(currentWorkspace)}
            title="ワークスペース設定"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-gray-200 text-gray-500"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 現在のワークスペース選択 */}
      <div className="px-2 py-2 border-b border-gray-200">
        <div className="flex items-center gap-1">
          <button
            className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-200 text-left transition-colors"
            onClick={() => onManage(currentWorkspace ?? workspaces[0])}
          >
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {currentWorkspace?.name?.charAt(0) ?? "W"}
            </div>
            <span className="text-sm font-medium text-gray-700 truncate flex-1">
              {currentWorkspace?.name ?? "ワークスペース"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          </button>
          <button
            onClick={() => setCreating(true)}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500"
            title="新しいワークスペースを作成"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 新規ワークスペース作成フォーム */}
        {creating && (
          <div className="mt-1.5 px-1">
            <input
              className="w-full text-sm border border-blue-400 rounded px-2 py-1 outline-none"
              placeholder="ワークスペース名"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
              autoFocus
            />
            <div className="flex gap-1.5 mt-1">
              <button
                className="flex-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded py-1 font-medium"
                onClick={handleCreate}
              >
                作成
              </button>
              <button
                className="flex-1 text-xs text-gray-600 bg-gray-200 hover:bg-gray-300 rounded py-1"
                onClick={() => { setCreating(false); setNewName(""); }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* コンテンツセクション */}
      <div className="flex-1 px-2 py-2">
        {/* ホーム */}
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-200 text-left text-sm text-gray-600 transition-colors mb-0.5">
          <Home className="h-3.5 w-3.5 shrink-0" />
          <span>ホーム</span>
        </button>

        {/* ダッシュボード */}
        <button
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors mb-0.5 ${view === "dashboard" ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-200"}`}
          onClick={() => onViewChange?.(view === "dashboard" ? "board" : "dashboard")}
        >
          <BarChart2 className="h-3.5 w-3.5 shrink-0" />
          <span>ダッシュボード</span>
        </button>

        {/* コンテンツセクション */}
        <div className="mt-2">
          <button
            className="w-full flex items-center gap-1 px-2 py-1 text-xs font-semibold text-gray-500 hover:text-gray-700 uppercase tracking-wide"
            onClick={() => setContentOpen(!contentOpen)}
          >
            {contentOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            コンテンツ
          </button>

          {contentOpen && (
            <div className="mt-1 space-y-0.5">
              {workspaces.map((ws) => (
                <div key={ws.id} className="relative group/item">
                  <button
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors ${
                      ws.id === currentWorkspaceId
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => onSwitch(ws.id)}
                  >
                    <Table2 className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    <span className="truncate flex-1">{ws.name}</span>
                  </button>

                  {/* ホバー時のメニュー */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/item:flex items-center gap-0.5">
                    <button
                      className="p-0.5 rounded hover:bg-gray-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === ws.id ? null : ws.id);
                      }}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>

                  {/* コンテキストメニュー */}
                  {menuOpenId === ws.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpenId(null)}
                      />
                      <div className="absolute right-0 top-full z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-36 mt-0.5">
                        <button
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => { setMenuOpenId(null); onManage(ws); }}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                          設定
                        </button>
                        <button
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(ws)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          削除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* 新規追加ボタン */}
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                onClick={() => setCreating(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>新規追加</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
