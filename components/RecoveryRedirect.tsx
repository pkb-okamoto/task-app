"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// URLハッシュにtype=recoveryが含まれる場合、パスワードリセットページへ転送
export default function RecoveryRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      router.replace("/invite/accept" + hash);
    }
  }, [router]);

  return null;
}
