"use client";

import { useEffect, useState, useTransition } from "react";
import { Mail, Pencil, Search, Trash2, UserPlus, X } from "lucide-react";
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
  initialMembers?: WorkspaceMember[] | null;
  onMembersChange?: (members: WorkspaceMember[]) => void;
}

const roleLabel = (role: string) => (role === "owner" ? "オーナー" : "メンバー");

export default function WorkspaceDialog({
  workspace,
  open,
  onOpenChange,
  allUsers,
  currentUserId,
  initialMembers,
  onMembersChange,
}: WorkspaceDialogProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [setupUrl, setSetupUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && workspace) {
      setNameValue(workspace.name);
      if (initialMembers && initialMembers.length > 0) {
        // プリフェッチ済みのデータを即座に表示
        setMembers(initialMembers);
        setLoading(false);
        // バックグラウンドで最新データに更新
        getWorkspaceMembers(workspace.id).then((fresh) => {
          setMembers(fresh);
        }).catch(() => {});
      } else {
        // キャッシュなし：ローディング表示してから取得
        setMembers([]);
        setLoading(true);
        getWorkspaceMembers(workspace.id).then((fresh) => {
          setMembers(fresh);
        }).catch(() => {}).finally(() => {
          setLoading(false);
        });
      }
    }
    if (!open) {
      setSearch("");
      setShowInviteForm(false);
      setEditingName(false);
      setInviteError("");
      setSetupUrl("");
      setRenameError("");
      setRemoveError("");
    }
  }, [open, workspace?.id, initialMembers]);

  if (!open || !workspace) return null;

  const isOwner = members.some((m) => m.user_id === currentUserId && m.role === "owner");

  const filteredMembers = members.filter((m) => {
    const user = m.user ?? allUsers.find((u) => u.id === m.user_id);
    return search === "" || user?.name?.toLowerCase().includes(search.toLowerCase());
  });

  const handleRenameSave = () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === workspace.name) { setEditingName(false); return; }
    setRenameError("");
    startTransition(async () => {
      try {
        await updateWorkspace(workspace.id, trimmed);
        setEditingName(false);
      } catch {
        setRenameError("名前の更新に失敗しました");
      }
    });
  };

  const handleRemoveMember = (userId: string, userName: string) => {
    if (!confirm(`「${userName}」をワークスペースから削除しますか？`)) return;
    setRemoveError("");
    startTransition(async () => {
      try {
        await removeMemberFromWorkspace(workspace.id, userId);
        const updated = await getWorkspaceMembers(workspace.id);
        setMembers(updated);
        onMembersChange?.(updated);
      } catch {
        setRemoveError("メンバーの削除に失敗しました");
      }
    });
  };

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteError("");
    setSetupUrl("");
    setCopied(false);
    startTransition(async () => {
      const result = await inviteMember(workspace.id, email);
      if (result.error) {
        setInviteError(result.error);
      } else {
        setSetupUrl(result.setupUrl ?? "");
        setInviteEmail("");
        const updated = await getWorkspaceMembers(workspace.id);
        setMembers(updated);
        onMembersChange?.(updated);
      }
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(setupUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">ワークスペースの設定</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── セクション1: ワークスペース名 ── */}
          <div className="px-6 py-5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              ワークスペース名
            </p>
            {editingName ? (
              <div className="flex gap-2">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSave();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  className="text-sm h-9 flex-1"
                  autoFocus
                />
                <Button size="sm" className="h-9 px-4" onClick={handleRenameSave}
                  disabled={!nameValue.trim()}>
                  保存
                </Button>
                <Button size="sm" variant="outline" className="h-9" onClick={() => setEditingName(false)}>
                  キャンセル
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-800 flex-1">{nameValue || workspace.name}</span>
                {isOwner && (
                  <button
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                    onClick={() => setEditingName(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    編集
                  </button>
                )}
              </div>
            )}
            {renameError && <p className="text-xs text-red-600 mt-1">{renameError}</p>}
          </div>

          {/* ── セクション2: メンバー ── */}
          <div className="px-6 py-5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              メンバー {loading ? "" : `(${members.length}人)`}
            </p>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-gray-50"
                placeholder="メンバーを検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {removeError && <p className="text-xs text-red-600 mb-2">{removeError}</p>}
            <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
              {loading ? (
                /* スケルトン */
                [1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded w-24" />
                      <div className="h-2.5 bg-gray-100 rounded w-14" />
                    </div>
                  </div>
                ))
              ) : filteredMembers.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">該当するメンバーがいません</p>
              ) : (
                filteredMembers.map((m) => {
                  const user = m.user ?? allUsers.find((u) => u.id === m.user_id);
                  return (
                    <div key={m.user_id} className="flex items-center gap-3 py-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={user?.avatar_url ?? ""} />
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                          {user?.name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {user?.name ?? "不明"}
                        </p>
                        <p className="text-xs text-gray-400">{roleLabel(m.role)}</p>
                      </div>
                      {isOwner && m.user_id !== currentUserId && m.role !== "owner" && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                          onClick={() => handleRemoveMember(m.user_id, user?.name ?? "このメンバー")}
                          title="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── セクション3: メンバーを追加 ── */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              メンバーを追加
            </p>
            {!showInviteForm ? (
              <button
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                onClick={() => setShowInviteForm(true)}
              >
                <UserPlus className="h-4 w-4" />
                メールで招待
              </button>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">招待メールを送信</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="メールアドレス"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                    className="text-sm h-9 flex-1"
                  />
                  <Button
                    size="sm"
                    className="h-9 px-4"
                    onClick={handleInvite}
                    disabled={isPending || !inviteEmail.trim()}
                  >
                    送信
                  </Button>
                </div>
                {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
                {setupUrl && (
                  <div className="text-xs bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                    <p className="text-green-700 font-medium">アカウントを作成しました</p>
                    <p className="text-gray-600">以下のURLをユーザーに送ってください。ユーザーがURLを開き、パスワード設定メールを自分で送信できます。</p>
                    <div className="flex gap-1.5">
                      <input
                        readOnly
                        value={setupUrl}
                        className="flex-1 text-xs font-mono bg-white border border-green-300 rounded px-2 py-1 text-gray-800 select-all outline-none"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={handleCopy}
                        className="shrink-0 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                      >
                        {copied ? "コピー済み" : "コピー"}
                      </button>
                    </div>
                  </div>
                )}
                <button
                  className="text-xs text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteError("");
                    setSetupUrl("");
                  }}
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}
