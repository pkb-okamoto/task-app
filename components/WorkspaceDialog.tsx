"use client";

import { useEffect, useState, useTransition } from "react";
import { Mail, Trash2, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getWorkspaceMembers,
  removeMemberFromWorkspace,
  updateWorkspace,
} from "@/lib/actions/workspaces";
import { inviteMember } from "@/lib/actions/invite";
import { type Workspace, type WorkspaceMember } from "@/lib/types";

interface WorkspaceDialogProps {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allUsers: { id: string; name: string; avatar_url: string | null }[];
  currentUserId: string;
  onMembersChange?: (members: WorkspaceMember[]) => void;
}

// ワークスペース管理ダイアログ（メンバー招待・名前変更）
export default function WorkspaceDialog({
  workspace,
  open,
  onOpenChange,
  allUsers,
  currentUserId,
  onMembersChange,
}: WorkspaceDialogProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [name, setName] = useState(workspace?.name ?? "");
  const [search, setSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setName(workspace?.name ?? "");
    if (workspace) {
      getWorkspaceMembers(workspace.id).then(setMembers);
    }
  }, [workspace]);

  if (!open || !workspace) return null;

  const isOwner = members.some((m) => m.user_id === currentUserId && m.role === "owner");
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
      onMembersChange?.(updated);
      setSearch("");
    });
  };

  const handleRemoveMember = (userId: string) => {
    startTransition(async () => {
      await removeMemberFromWorkspace(workspace.id, userId);
      const updated = await getWorkspaceMembers(workspace.id);
      setMembers(updated);
      onMembersChange?.(updated);
    });
  };

  const handleInvite = () => {
    const email = inviteEmail.trim();
    const name = inviteName.trim();
    if (!email || !name) return;
    setInviteError("");
    setInviteSuccess(false);
    startTransition(async () => {
      const result = await inviteMember(workspace.id, email, name);
      if (result.error) {
        setInviteError(result.error);
      } else {
        setInviteSuccess(true);
        setInviteEmail("");
        setInviteName("");
        const updated = await getWorkspaceMembers(workspace.id);
        setMembers(updated);
        onMembersChange?.(updated);
      }
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
          {/* ワークスペース名（ownerのみ編集可） */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">ワークスペース名</label>
            {isOwner ? (
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
                  className="flex-1 text-sm h-9"
                />
                <Button size="sm" className="h-9" onClick={handleSaveName}>保存</Button>
              </div>
            ) : (
              <p className="text-sm text-gray-700 px-1">{workspace.name}</p>
            )}
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
                    {isOwner && m.user_id !== currentUserId && m.role !== "owner" && (
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

            {/* メール招待（ownerのみ） */}
            {isOwner && <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-500">メールで招待</span>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="名前"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="text-sm h-8"
                />
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="メールアドレス"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                    className="text-sm h-8 flex-1"
                  />
                  <Button size="sm" className="h-8 px-3" onClick={handleInvite}
                    disabled={!inviteEmail.trim() || !inviteName.trim()}>
                    <UserPlus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {inviteError && (
                  <p className="text-xs text-red-600">{inviteError}</p>
                )}
                {inviteSuccess && (
                  <p className="text-xs text-green-600">招待メールを送信しました</p>
                )}
              </div>
            </div>}
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
