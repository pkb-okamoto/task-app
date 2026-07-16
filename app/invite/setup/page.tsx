"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function SetupContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/invite/accept`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">アカウントのセットアップ</h1>
          <p className="text-sm text-gray-500 mt-1">ワークスペースに招待されました</p>
        </div>

        {!sent ? (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
              <p className="font-medium text-gray-800">{email}</p>
              <p className="text-gray-500 mt-0.5">のアカウントが作成されています</p>
            </div>
            <p className="text-sm text-gray-600">
              ボタンを押すとパスワード設定メールが届きます。
            </p>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button className="w-full" onClick={handleSend} disabled={loading || !email}>
              {loading ? "送信中..." : "パスワード設定メールを送信"}
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">メールを送信しました</p>
            <p className="text-sm text-gray-500">
              {email} にパスワード設定のメールをお送りしました。<br />
              メール内のリンクからパスワードを設定してください。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InviteSetupPage() {
  return (
    <Suspense>
      <SetupContent />
    </Suspense>
  );
}
