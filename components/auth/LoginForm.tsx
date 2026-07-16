"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp } from "@/lib/actions/auth";
import { USER_COLORS } from "@/lib/user-colors";
import { createClient } from "@/lib/supabase/client";

// ログイン・サインアップ切り替えフォーム
export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState("blue");
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const searchParams = useSearchParams();
  const passwordSet = searchParams.get("message") === "password_set";

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://task-app-sooty-one.vercel.app";
    await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${appUrl}/auth/callback?next=/invite/accept`,
    });
    setResetSent(true);
    setResetLoading(false);
  };

  const handleSignIn = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  const handleSignUp = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    formData.set("color", selectedColor);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <>
    {passwordSet && (
      <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg mb-4 text-center">
        パスワードを設定しました。メールアドレスとパスワードでログインしてください。
      </p>
    )}
    <Tabs defaultValue="login" onValueChange={() => setError(null)}>
      <TabsList className="w-full mb-4">
        <TabsTrigger value="login" className="flex-1">ログイン</TabsTrigger>
        <TabsTrigger value="signup" className="flex-1">サインアップ</TabsTrigger>
      </TabsList>

      {/* ログインタブ */}
      <TabsContent value="login">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ログイン</CardTitle>
            <CardDescription>メールアドレスとパスワードでログインします</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSignIn} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="login-email">メールアドレス</Label>
                <Input id="login-email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="login-password">パスワード</Label>
                <Input id="login-password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "ログイン中..." : "ログイン"}
              </Button>
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="text-xs text-gray-400 hover:text-gray-600 w-full text-center"
              >
                パスワードを忘れた方はこちら
              </button>
            </form>

            {showReset && (
              <div className="mt-4 border-t pt-4">
                {resetSent ? (
                  <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md text-center">
                    パスワードリセットメールを送信しました。メールをご確認ください。
                  </p>
                ) : (
                  <form onSubmit={handlePasswordReset} className="grid gap-3">
                    <p className="text-sm text-gray-600">登録済みのメールアドレスを入力してください。</p>
                    <Input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                    <Button type="submit" variant="outline" className="w-full" disabled={resetLoading}>
                      {resetLoading ? "送信中..." : "リセットメールを送信"}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* サインアップタブ */}
      <TabsContent value="signup">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">アカウント作成</CardTitle>
            <CardDescription>新しいアカウントを作成します</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSignUp} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="signup-name">名前</Label>
                <Input id="signup-name" name="name" type="text" placeholder="田中太郎" required autoComplete="name" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="signup-email">メールアドレス</Label>
                <Input id="signup-email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="signup-password">パスワード（6文字以上）</Label>
                <Input id="signup-password" name="password" type="password" placeholder="••••••••" required minLength={6} autoComplete="new-password" />
              </div>

              {/* アカウントカラー選択 */}
              <div className="grid gap-2">
                <Label>アカウントカラー</Label>
                <div className="flex flex-wrap gap-2">
                  {USER_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSelectedColor(c.value)}
                      className={`w-7 h-7 rounded-full ${c.bg} transition-all ${
                        selectedColor === c.value
                          ? "ring-2 ring-offset-2 " + c.ring + " scale-110"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  選択中：{USER_COLORS.find((c) => c.value === selectedColor)?.label}
                </p>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "作成中..." : "アカウントを作成"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    </>
  );
}
