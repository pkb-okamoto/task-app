"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getWorkspaceMembers,
  removeMemberFromWorkspace,
  updateWorkspace,
} from "@/lib/actions/workspaces";
import { type Workspace, type WorkspaceMember } from "@/lib/types";

interface WorkspaceDialogProps {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allUsers: { id: string; name: string; avatar_url: string | null }[];
  currentUserId: string;
}

// ワークスペース管理ダイアログ（メンバー招待・名前変更）
export default function WorkspaceDialog({
  workspace,
  open,
  onOpenChange,
  allUsers,
  currentUserId,
}: WorkspaceDialogProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [name, setName] = useState(workspace?.name ?? "");
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setName(workspace?.name ?? "");
    if (workspace) {
      getWorkspaceMembers(workspace.id).then(setMembers);
    }
  }, [workspace]);

  if (!open || !workspace) return null;

  const memberIds = members.map((m) => m.user_id);

  // 追加可能なユーザー（検索でフィルタ、すでにメンバーは除外）
  const addableUsers = allUsers.filter(
    (u) => !memberIds.includes(u.id) &&
      (search === "" || u.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === workspace.name) return;
    startTransition(async () => {
      await updateWorkspace(workspace.id, trimmed);
    });
  };

  const handleAddMember = (userId: string) => {
    startTransition(async () => {
      const { addMemberToWorkspace } = await import("@/lib/actions/workspaces");
      await addMemberToWorkspace(workspace.id, userId);
      const updated = await getWorkspaceMembers(workspace.id);
      setMembers(updated);
      setSearch("");
    });
  };

  const handleRemoveMember = (userId: string) => {
    startTransition(async () => {
      await removeMemberFromWorkspace(workspace.id, userId);
      const updated = await getWorkspaceMembers(workspace.id);
      setMembers(updated);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">ワークスペースの設定</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* ワークスペース名 */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">ワークスペース名</label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
                className="flex-1 text-sm h-9"
              />
              <Button size="sm" className="h-9" onClick={handleSaveName}>保存</Button>
            </div>
          </div>

          {/* メンバー一覧 */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              メンバー（{members.length}人）
            </label>
            <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
              {members.map((m) => {
                const user = m.user ?? allUsers.find((u) => u.id === m.user_id);
                return (
                  <div key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user?.avatar_url ?? ""} />
                      <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                        {user?.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm text-gray-800">{user?.name ?? "不明"}</span>
                    <span className="text-xs text-gray-400">{m.role === "owner" ? "オーナー" : "メンバー"}</span>
                    {m.user_id !== currentUserId && m.role !== "owner" && (
                      <button
                        className="p-1 rounded hover:bg-red-50"
                        onClick={() => handleRemoveMember(m.user_id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* メンバー追加 */}
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-500">メンバーを追加</span>
              </div>
              <Input
                placeholder="名前で検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-sm h-8 mb-2"
              />
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {addableUsers.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">追加できるユーザーがいません</p>
                )}
                {addableUsers.map((user) => (
                  <button
                    key={user.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 text-left transition-colors"
                    onClick={() => handleAddMember(user.id)}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar_url ?? ""} />
                      <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-700">{user.name}</span>
                    <span className="ml-auto text-xs text-blue-600">追加</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>閉じる</Button>
        </div>
      </div>
    </div>
  );
}
