"use client";

import { useEffect, useState, useTransition } from "react";
import { Mail, Search, Trash2, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteMember } from "@/lib/actions/invite";
import { getUserEmails, deleteUser } from "@/lib/actions/users";
import { type Workspace } from "@/lib/types";

interface MemberListProps {
  workspace: Workspace | null;
  allUsers: { id: string; name: string; avatar_url: string | null }[];
  currentUserId: string;
  onUserDeleted?: (userId: string) => void;
}

export default function MemberList({ workspace, allUsers, currentUserId, onUserDeleted }: MemberListProps) {
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [localUsers, setLocalUsers] = useState(allUsers);
  const [search, setSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocalUsers(allUsers);
  }, [allUsers]);

  useEffect(() => {
    getUserEmails().then(setEmailMap);
  }, []);

  if (!workspace) return null;

  const filteredUsers = localUsers.filter((u) =>
    search === "" || u.name.toLowerCase().includes(search.toLowerCase()) ||
    (emailMap[u.id] ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (userId: string, userName: string) => {
    if (!confirm(`「${userName}」のアカウントをアプリから削除しますか？\nこの操作は取り消せません。`)) return;
    startTransition(async () => {
      const result = await deleteUser(userId);
      if (result.error) {
        alert("削除に失敗しました: " + result.error);
      } else {
        setLocalUsers((prev) => prev.filter((u) => u.id !== userId));
        onUserDeleted?.(userId);
      }
    });
  };

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteError("");
    setInviteSuccess(false);
    setTempPassword("");
    startTransition(async () => {
      const result = await inviteMember(workspace.id, email);
      if (result.error) {
        setInviteError(result.error);
      } else {
        setInviteSuccess(true);
        setTempPassword(result.tempPassword ?? "");
        setInviteEmail("");
      }
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* タイトル */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">メンバー</h1>
          {!showInviteForm && (
            <button
              className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
              onClick={() => setShowInviteForm(true)}
            >
              <UserPlus className="h-4 w-4" />
              メンバーを招待
            </button>
          )}
        </div>

        {/* 招待フォーム */}
        {showInviteForm && (
          <div className="mb-6 p-4 border border-blue-100 bg-blue-50 rounded-xl space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">メールで招待</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="メールアドレス"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                className="text-sm h-9 flex-1 bg-white"
              />
              <Button size="sm" className="h-9 px-4" onClick={handleInvite}
                disabled={isPending || !inviteEmail.trim()}>
                {isPending ? "送信中..." : "送信"}
              </Button>
            </div>
            {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
            {inviteSuccess && tempPassword && (
              <div className="text-xs bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                <p className="text-green-700 font-medium">ユーザーを追加しました</p>
                <p className="text-gray-600">以下の仮パスワードをユーザーに伝えてください：</p>
                <p className="font-mono bg-white border border-green-300 rounded px-2 py-1 text-sm text-gray-900 select-all">{tempPassword}</p>
                <p className="text-gray-500">ログイン後、プロフィールからパスワードを変更できます。</p>
              </div>
            )}
            <button
              className="text-xs text-gray-400 hover:text-gray-600"
              onClick={() => { setShowInviteForm(false); setInviteError(""); setInviteSuccess(false); }}
            >
              キャンセル
            </button>
          </div>
        )}

        {/* 検索 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-gray-50"
            placeholder="メンバーを検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* テーブルヘッダー */}
        <div className="flex items-center px-3 py-2 border-b border-gray-200 mb-1">
          <span className="text-xs font-medium text-gray-400 flex-1">名前</span>
          <span className="text-xs font-medium text-gray-400 w-16 text-right">削除</span>
        </div>

        {/* メンバー行 */}
        <div className="divide-y divide-gray-100">
          {filteredUsers.map((u) => {
            const email = emailMap[u.id] ?? "";
            const isSelf = u.id === currentUserId;
            return (
              <div key={u.id} className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={u.avatar_url ?? ""} />
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                    {u.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {u.name}{isSelf && <span className="ml-1.5 text-xs text-gray-400">（自分）</span>}
                  </p>
                  {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
                </div>
                {!isSelf && (
                  <button
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                    onClick={() => handleDelete(u.id, u.name)}
                    disabled={isPending}
                    title="アカウントを削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {isSelf && <span className="w-9 shrink-0" />}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 mt-4">{localUsers.length}人のメンバー</p>
      </div>
    </div>
  );
}
