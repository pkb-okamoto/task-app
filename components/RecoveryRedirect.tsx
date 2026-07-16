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
    const next = searchParams.get("next");
    if (code) {
      const supabase = createClient();
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          // nextがある場合はそこへ（パスワードリセット）、ない場合はホームへ（マジックリンク）
          window.location.href = next ?? "/";
        }
      });
    }
  }, [router, searchParams]);

  return null;
}
