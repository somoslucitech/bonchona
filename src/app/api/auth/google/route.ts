import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCloudflareEnv } from "@/lib/cf-env";

export const dynamic = "force-dynamic";

const OAUTH_COOKIE_PATH = "/api/auth/google";
const OAUTH_COOKIE_MAX_AGE = 300; // 5 minutes — only needs to survive the Google redirect round-trip

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const env = getCloudflareEnv();
  const clientId = env?.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(new URL("/admin?error=oauth_not_configured", url.origin));
  }

  const invite = url.searchParams.get("invite");
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });
  if (invite) {
    cookieStore.set("pending_invite", invite, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: OAUTH_COOKIE_PATH,
      maxAge: OAUTH_COOKIE_MAX_AGE,
    });
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(authUrl.toString());
}
