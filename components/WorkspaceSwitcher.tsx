"use client";

import { useRef, useState, useTransition } from "react";
import { Check, ChevronDown, Plus, Settings, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createWorkspace, deleteWorkspace } from "@/lib/actions/workspaces";
import { type Workspace } from "@/lib/types";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  onSwitch: (workspaceId: string) => void;
  onManage: (workspace: Workspace) => void;
}

// ヘッダーに表示するワークスペース切り替えUI
export default function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  onSwitch,
  onManage,
}: WorkspaceSwitcherProps) {
  const [, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const current = workspaces.find((w) => w.id === currentWorkspaceId);

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

  const handleDelete = (e: React.MouseEvent, ws: Workspace) => {
    e.stopPropagation();
    if (!confirm(`「${ws.name}」を削除しますか？\nこのワークスペースのタスクとグループも削除されます。`)) return;
    startTransition(async () => {
      await deleteWorkspace(ws.id);
      const remaining = workspaces.filter((w) => w.id !== ws.id);
      if (remaining.length > 0) onSwitch(remaining[0].id);
    });
  };

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-gray-100 cursor-pointer outline-none transition-colors">
          <span className="text-sm font-medium text-gray-700">
            {current?.name ?? "ワークスペースを選択"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          {/* ワークスペース一覧 */}
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              className="flex items-center justify-between gap-2"
              onClick={() => onSwitch(ws.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Check className={`h-3.5 w-3.5 shrink-0 ${ws.id === currentWorkspaceId ? "opacity-100 text-blue-600" : "opacity-0"}`} />
                <span className="text-sm truncate">{ws.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-0.5 rounded hover:bg-gray-200"
                  onClick={(e) => { e.stopPropagation(); onManage(ws); }}
                >
                  <Settings className="h-3.5 w-3.5 text-gray-500" />
                </button>
                <button
                  className="p-0.5 rounded hover:bg-red-100"
                  onClick={(e) => handleDelete(e, ws)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
            </DropdownMenuItem>
          ))}

          {workspaces.length === 0 && (
            <DropdownMenuItem disabled>ワークスペースがありません</DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* 新規作成ボタン */}
          <DropdownMenuItem
            className="gap-2 text-blue-600"
            onClick={() => {
              setCreating(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            新しいワークスペースを作成
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 新規作成フォーム（ドロップダウン外のポップアップ） */}
      {creating && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64">
          <p className="text-xs font-medium text-gray-500 mb-2">ワークスペース名</p>
          <input
            ref={inputRef}
            className="w-full text-sm border border-blue-400 rounded px-2 py-1.5 outline-none mb-2"
            placeholder="例：デザインチーム"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
              onClick={() => { setCreating(false); setNewName(""); }}
            >
              キャンセル
            </button>
            <button
              className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded font-medium"
              onClick={handleCreate}
            >
              作成
            </button>
          </div>
        </div>
      )}

      {/* 背景クリックで閉じる */}
      {creating && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setCreating(false); setNewName(""); }}
        />
      )}
    </div>
  );
}
