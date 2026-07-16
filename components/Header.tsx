"use client";

import { useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationPopover from "@/components/NotificationPopover";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import WorkspaceDialog from "@/components/WorkspaceDialog";
import ProfileDialog from "@/components/ProfileDialog";
import SettingsDialog from "@/components/SettingsDialog";
import { signOut } from "@/lib/actions/auth";
import { getColorStyle } from "@/lib/user-colors";
import { type User as UserType, type Workspace } from "@/lib/types";

interface HeaderProps {
  currentUser: UserType | null;
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  onWorkspaceSwitch: (workspaceId: string) => void;
  allUsers: UserType[];
  googleConnected?: boolean;
}

export default function Header({
  currentUser,
  workspaces,
  currentWorkspaceId,
  onWorkspaceSwitch,
  allUsers,
  googleConnected = false,
}: HeaderProps) {
  const displayName = currentUser?.name ?? "ゲスト";
  const initial = displayName.charAt(0);
  const colorStyle = getColorStyle(currentUser?.color ?? "blue");

  const [manageTarget, setManageTarget] = useState<Workspace | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleManage = (ws: Workspace) => {
    setManageTarget(ws);
    setDialogOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shadow-sm">
        {/* ロゴ */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <LayoutDashboard className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-gray-900 text-lg tracking-tight">TaskBoard</span>
        </div>

        {/* ワークスペース切り替え */}
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onSwitch={onWorkspaceSwitch}
          onManage={handleManage}
        />

        <div className="flex-1" />

        {/* 通知ポップオーバー */}
        <NotificationPopover currentUser={currentUser} />

        {/* ユーザーメニュー */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors outline-none">
            <Avatar className="h-7 w-7">
              <AvatarImage src={currentUser?.avatar_url ?? ""} alt={displayName} />
              <AvatarFallback className={`text-xs text-white ${colorStyle.bg}`}>
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{displayName}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="gap-2" onClick={() => setProfileOpen(true)}>
              <User className="h-4 w-4" />
              プロフィール
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
              設定
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-red-600" onClick={() => signOut().catch(() => alert("ログアウトに失敗しました"))}>
              <LogOut className="h-4 w-4" />
              ログアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ワークスペース管理ダイアログ */}
      <WorkspaceDialog
        workspace={manageTarget}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        allUsers={allUsers}
        currentUserId={currentUser?.id ?? ""}
      />

      {/* プロフィールダイアログ */}
      {currentUser && (
        <ProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          currentUser={currentUser}
          googleConnected={googleConnected}
        />
      )}

      {/* 設定ダイアログ */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
