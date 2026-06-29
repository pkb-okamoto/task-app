"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 招待リンクからのパスワード設定ページ
export default function InviteAcceptPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // URLのhashからセッションを取得（Supabaseが自動でセッションを設定）
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      else setError("招待リンクが無効か期限切れです。再度招待を依頼してください。");
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("パスワードが一致しません");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">招待を受け入れる</h1>
          <p className="text-sm text-gray-500 mt-1">パスワードを設定してアカウントを有効化してください</p>
        </div>

        {!ready && !error && (
          <p className="text-center text-sm text-gray-500">読み込み中...</p>
        )}

        {error && (
          <p className="text-center text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>
        )}

        {ready && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>新しいパスワード</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>パスワード（確認）</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="もう一度入力"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "設定中..." : "パスワードを設定してログイン"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
