"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, X, CalendarDays, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { USER_COLORS, getColorStyle } from "@/lib/user-colors";
import { type User } from "@/lib/types";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User;
  googleConnected?: boolean;
}

// プロフィール設定ダイアログ（名前・アカウントカラー・アイコン画像）
export default function ProfileDialog({ open, onOpenChange, currentUser, googleConnected = false }: ProfileDialogProps) {
  const [name, setName] = useState(currentUser.name);
  const [color, setColor] = useState(currentUser.color ?? "blue");
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage("パスワードが一致しません");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage("パスワードは8文字以上で入力してください");
      return;
    }
    setPasswordLoading(true);
    setPasswordMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMessage(error.message);
    } else {
      setPasswordMessage("パスワードを変更しました");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  };

  if (!open) return null;

  const colorStyle = getColorStyle(color);

  // 画像をSupabase Storageにアップロード
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB制限
    if (file.size > 5 * 1024 * 1024) {
      setMessage("画像は5MB以下にしてください");
      return;
    }

    setUploading(true);
    setMessage(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setMessage("アップロードに失敗しました");
      setUploading(false);
      return;
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + `?t=${Date.now()}`; // キャッシュバスター

    // usersテーブルのavatar_urlを更新
    await supabase.from("users").update({ avatar_url: publicUrl }).eq("id", user.id);
    setAvatarUrl(publicUrl);
    setUploading(false);
    setMessage("画像をアップロードしました");
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateProfile({ name: name.trim(), color });
      if (result?.error) {
        setMessage(result.error);
      } else {
        setMessage("保存しました");
        setTimeout(() => onOpenChange(false), 800);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">プロフィール設定</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* アバター画像アップロード */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className={`text-white text-2xl font-bold ${colorStyle.bg}`}>
                  {name.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              {/* カメラアイコン（クリックでファイル選択） */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <p className="text-xs text-gray-400">
              {uploading ? "アップロード中..." : "カメラアイコンをクリックして画像を変更"}
            </p>
          </div>

          {/* 名前 */}
          <div className="grid gap-1.5">
            <Label>名前</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="田中太郎"
            />
          </div>

          {/* アカウントカラー */}
          <div className="grid gap-2">
            <Label>アカウントカラー</Label>
            <div className="flex flex-wrap gap-2.5">
              {USER_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full ${c.bg} transition-all ${
                    color === c.value
                      ? "ring-2 ring-offset-2 " + c.ring + " scale-110"
                      : "opacity-50 hover:opacity-80"
                  }`}
                  title={c.label}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400">
              選択中：{USER_COLORS.find((c) => c.value === color)?.label}
            </p>
          </div>

          {/* パスワード変更 */}
          <div className="grid gap-2">
            <Label>パスワード変更</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新しいパスワード（8文字以上）"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="確認用パスワード"
            />
            {passwordMessage && (
              <p className={`text-sm px-3 py-2 rounded-md ${
                passwordMessage.includes("変更しました")
                  ? "text-green-700 bg-green-50"
                  : "text-red-600 bg-red-50"
              }`}>
                {passwordMessage}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePasswordChange}
              disabled={passwordLoading || !newPassword || !confirmPassword}
            >
              {passwordLoading ? "変更中..." : "パスワードを変更する"}
            </Button>
          </div>

          {/* Googleカレンダー連携 */}
          <div className="grid gap-1.5">
            <Label>Googleカレンダー連携</Label>
            {googleConnected ? (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>連携済み</span>
              </div>
            ) : (
              <a
                href="/api/auth/google"
                className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors w-fit"
              >
                <CalendarDays className="h-4 w-4" />
                Googleカレンダーと連携する
              </a>
            )}
          </div>

          {message && (
            <p className={`text-sm px-3 py-2 rounded-md ${
              message.includes("しました")
                ? "text-green-700 bg-green-50"
                : "text-red-600 bg-red-50"
            }`}>
              {message}
            </p>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button size="sm" onClick={handleSave} disabled={isPending || uploading || !name.trim()}>
            {isPending ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </div>
  );
}
