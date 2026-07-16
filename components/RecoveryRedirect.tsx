"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// URLにcodeパラメータがある場合、セッション交換してnextへ転送
export default function RecoveryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // ハッシュベース（type=recovery または type=invite）
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("type=invite")) {
      router.replace("/invite/accept" + hash);
      return;
    }

    // PKCEコードベース（code + next パラメータ）
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/invite/accept";
    if (code) {
      const supabase = createClient();
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          window.location.href = next;
        } else {
          // コードが既に消費済みの場合、既存セッションを確認してリダイレクト
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) window.location.href = next;
          });
        }
      });
    }
  }, [router, searchParams]);

  return null;
}
