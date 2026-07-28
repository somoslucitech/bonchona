import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCloudflareEnv } from "@/lib/cf-env";
import { getUserByEmail, createUser, touchLastLogin } from "@/lib/users";
import { getValidInvite, markInviteUsed } from "@/lib/invites";
import { createSession } from "@/lib/sessions";
import { signSessionId, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const OAUTH_COOKIE_PATH = "/api/auth/google";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;
  const pendingInvite = cookieStore.get("pending_invite")?.value;
  // One-time-use cookies: clear immediately regardless of outcome.
  cookieStore.set("oauth_state", "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });
  cookieStore.set("pending_invite", "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });

  if (url.searchParams.get("error")) {
    return NextResponse.redirect(new URL("/admin?error=oauth_denied", url.origin));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/admin?error=invalid_state", url.origin));
  }

  const env = getCloudflareEnv();
  const clientId = env?.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = env?.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/admin?error=oauth_not_configured", url.origin));
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", tokenRes.status, await tokenRes.text());
      return NextResponse.redirect(new URL("/admin?error=oauth_failed", url.origin));
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    // Calling Google's own userinfo endpoint with the access token we just
    // obtained via a direct authenticated call to Google's token endpoint
    // carries the same trust as verifying the id_token's JWT signature,
    // without needing JWKS/RS256 handling.
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(new URL("/admin?error=oauth_failed", url.origin));
    }

    const profile = (await profileRes.json()) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    if (!profile.email || !profile.email_verified) {
      return NextResponse.redirect(new URL("/admin?error=email_not_verified", url.origin));
    }

    const email = profile.email.toLowerCase();
    let user = await getUserByEmail(email);

    if (!user) {
      if (!pendingInvite) {
        return NextResponse.redirect(new URL("/admin?error=not_invited", url.origin));
      }
      const invite = await getValidInvite(pendingInvite, email);
      if (!invite) {
        return NextResponse.redirect(new URL("/admin?error=not_invited", url.origin));
      }
      user = await createUser({
        email,
        name: profile.name ?? null,
        avatarUrl: profile.picture ?? null,
        role: invite.role,
        invitedBy: invite.createdBy,
      });
      await markInviteUsed(pendingInvite);
    } else if (user.status === "revoked") {
      return NextResponse.redirect(new URL("/admin?error=revoked", url.origin));
    }

    const session = await createSession(user.id, request.headers.get("user-agent"));
    await touchLastLogin(user.id);

    const signedCookie = await signSessionId(session.id);
    cookieStore.set(SESSION_COOKIE_NAME, signedCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE,
    });

    return NextResponse.redirect(new URL("/admin", url.origin));
  } catch (e) {
    console.error("OAuth callback error:", e);
    return NextResponse.redirect(new URL("/admin?error=oauth_failed", url.origin));
  }
}
