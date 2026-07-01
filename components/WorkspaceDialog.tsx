"use client";

import { useEffect, useState, useTransition } from "react";
import { Mail, Search, Trash2, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getWorkspaceMembers,
  removeMemberFromWorkspace,
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

const roleLabel = (role: string) => {
  if (role === "owner") return "オーナー";
  return "メンバー";
};

export default function WorkspaceDialog({
  workspace,
  open,
  onOpenChange,
  allUsers,
  currentUserId,
  onMembersChange,
}: WorkspaceDialogProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [search, setSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (workspace) {
      getWorkspaceMembers(workspace.id).then(setMembers);
    }
  }, [workspace]);

  if (!open || !workspace) return null;

  const isOwner = members.some((m) => m.user_id === currentUserId && m.role === "owner");

  const filteredMembers = members.filter((m) => {
    const user = m.user ?? allUsers.find((u) => u.id === m.user_id);
    return search === "" || user?.name?.toLowerCase().includes(search.toLowerCase());
  });

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
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/20" onClick={() => onOpenChange(false)} />
      {/* 右パネル */}
      <div className="relative bg-white shadow-xl w-80 h-full flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">メンバー</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* 検索 */}
          <div className="px-6 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-gray-50"
                placeholder="メンバーを検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* テーブルヘッダー */}
          <div className="px-6 pb-2 flex items-center border-b border-gray-100">
            <span className="text-xs text-gray-400 flex-1">名前</span>
            <span className="text-xs text-gray-400 w-32">役割</span>
            {isOwner && <span className="w-8" />}
          </div>

          {/* メンバー一覧 */}
          <div className="px-6 divide-y divide-gray-50">
            {filteredMembers.map((m) => {
              const user = m.user ?? allUsers.find((u) => u.id === m.user_id);
              return (
                <div key={m.user_id} className="flex items-center gap-3 py-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={user?.avatar_url ?? ""} />
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {user?.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                    {user?.name ?? "不明"}
                  </span>
                  <span className="text-sm text-gray-500 w-32">{roleLabel(m.role)}</span>
                  {isOwner && m.user_id !== currentUserId && m.role !== "owner" ? (
                    <button
                      className="w-8 flex justify-center p-1 rounded hover:bg-red-50"
                      onClick={() => handleRemoveMember(m.user_id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  ) : isOwner ? (
                    <span className="w-8" />
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* 招待フォーム（ownerのみ） */}
          {isOwner && (
            <div className="px-6 py-4 border-t border-gray-100 mt-2">
              {!showInviteForm ? (
                <button
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  onClick={() => setShowInviteForm(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  メンバーを招待
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">メールで招待</span>
                  </div>
                  <Input
                    placeholder="名前"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="text-sm h-9"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="メールアドレス"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                      className="text-sm h-9 flex-1"
                    />
                    <Button size="sm" className="h-9 px-4" onClick={handleInvite}
                      disabled={!inviteEmail.trim() || !inviteName.trim()}>
                      送信
                    </Button>
                  </div>
                  {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
                  {inviteSuccess && <p className="text-xs text-green-600">招待メールを送信しました</p>}
                  <button
                    className="text-xs text-gray-400 hover:text-gray-600"
                    onClick={() => { setShowInviteForm(false); setInviteError(""); setInviteSuccess(false); }}
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>閉じる</Button>
        </div>
      </div>
    </div>
  );
}
