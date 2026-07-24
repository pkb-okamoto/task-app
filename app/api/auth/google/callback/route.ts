import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

// GET /api/auth/google/callback
// Google OAuthコールバック：トークンを取得してSupabaseに保存
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?google=error", request.url));
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  let tokens;
  try {
    ({ tokens } = await oauth2Client.getToken(code));
  } catch {
    return NextResponse.redirect(new URL("/?google=error&reason=token_failed", request.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/?google=error", request.url));
  }

  // refresh_tokenがない場合はエラー（再認証が必要）
  if (!tokens.refresh_token) {
    console.error("[Google OAuth] refresh_token が取得できませんでした。prompt=consent が必要です。");
    return NextResponse.redirect(new URL("/?google=error&reason=no_refresh_token", request.url));
  }

  // トークンをDBに保存（upsert）
  const { error: upsertError } = await supabase.from("user_google_tokens").upsert({
    user_id: user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  }, { onConflict: "user_id" });

  if (upsertError) {
    console.error("[Google OAuth] トークン保存エラー:", upsertError.message);
    return NextResponse.redirect(new URL("/?google=error&reason=db_error", request.url));
  }

  console.log("[Google OAuth] トークン保存成功 userId:", user.id);
  return NextResponse.redirect(new URL("/?google=connected", request.url));
}
