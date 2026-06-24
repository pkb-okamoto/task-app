"use client";

import { Bell, ChevronDown, LayoutDashboard, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/auth";
import { type User as UserType } from "@/lib/types";

interface HeaderProps {
  currentUser: UserType | null;
}

// ヘッダーコンポーネント（ナビゲーション・ユーザーメニュー）
export default function Header({ currentUser }: HeaderProps) {
  const displayName = currentUser?.name ?? "ゲスト";
  const initial = displayName.charAt(0);

  return (
    <header className="sticky top-0 z-50 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shadow-sm">
      {/* ロゴ */}
      <div className="flex items-center gap-2 min-w-[180px]">
        <LayoutDashboard className="h-6 w-6 text-blue-600" />
        <span className="font-bold text-gray-900 text-lg tracking-tight">TaskBoard</span>
      </div>

      {/* ワークスペース名 */}
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-gray-100 cursor-pointer">
        <span className="text-sm font-medium text-gray-700">マイワークスペース</span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
      </div>

      {/* スペーサー */}
      <div className="flex-1" />

      {/* 通知ボタン */}
      <Button variant="ghost" size="icon" className="relative text-gray-500">
        <Bell className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
      </Button>

      {/* ユーザーメニュー */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors outline-none">
          <Avatar className="h-7 w-7">
            <AvatarImage src={currentUser?.avatar_url ?? ""} alt={displayName} />
            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">{initial}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{displayName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="gap-2">
            <User className="h-4 w-4" />
            プロフィール
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <Settings className="h-4 w-4" />
            設定
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* ログアウト */}
          <DropdownMenuItem
            className="gap-2 text-red-600"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
