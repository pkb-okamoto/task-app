"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// URLにcodeパラメータがある場合、セッション交換してnextへ転送
export default function RecoveryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // ハッシュベース（type=recovery）
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
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
          router.replace(next);
        }
      });
    }
  }, [router, searchParams]);

  return null;
}
