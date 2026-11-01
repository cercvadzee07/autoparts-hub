import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Locale } from "@/i18n/config";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SEED_STORE } from "@/lib/data/seed";
import type { AdminSession, UserRole } from "@/lib/types";
import type { Actor } from "@/lib/data";

const DEMO_COOKIE = "ap_admin";
const DEMO_TTL_SECONDS = 60 * 60 * 12;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET (32+ chars) is required in production demo mode");
  }
  return "dev-only-insecure-session-secret-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function demoCredentials() {
  return {
    email: (process.env.DEMO_ADMIN_EMAIL || "admin@autoparts.local").toLowerCase(),
    password: process.env.DEMO_ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "demo-admin-2026"),
  };
}

export type SignInResult = { ok: true } | { ok: false; reason: "invalid" | "not_staff" };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, reason: "invalid" };
    const session = await loadSupabaseSession();
    if (!session) {
      await supabase.auth.signOut();
      return { ok: false, reason: "not_staff" };
    }
    return { ok: true };
  }

  const creds = demoCredentials();
  if (!creds.password || !safeEqual(email.toLowerCase(), creds.email) || !safeEqual(password, creds.password)) {
    return { ok: false, reason: "invalid" };
  }
  const payload = Buffer.from(
    JSON.stringify({ email: creds.email, exp: Math.floor(Date.now() / 1000) + DEMO_TTL_SECONDS }),
  ).toString("base64url");
  (await cookies()).set(DEMO_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_TTL_SECONDS,
  });
  return { ok: true };
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    await (await createSupabaseServerClient()).auth.signOut();
  }
  (await cookies()).delete(DEMO_COOKIE);
}

async function loadSupabaseSession(): Promise<AdminSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle(),
    supabase.from("store_members").select("store_id, role").eq("user_id", user.id).limit(1).maybeSingle(),
  ]);
  const role = (profile?.role as UserRole | undefined) ?? "customer";
  let storeId = membership?.store_id as string | undefined;
  if (!storeId && role === "platform_admin") {
    const { data: store } = await supabase.from("stores").select("id").order("created_at").limit(1).maybeSingle();
    storeId = store?.id as string | undefined;
  }
  if (!storeId) return null;
  return {
    userId: user.id,
    email: user.email ?? "",
    name: (profile?.full_name as string | null) || user.email || "Admin",
    role: role === "customer" ? (membership?.role === "owner" ? "store_owner" : "store_staff") : role,
    storeId,
  };
}

async function loadDemoSession(): Promise<AdminSession | null> {
  const raw = (await cookies()).get(DEMO_COOKIE)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email: string; exp: number };
    if (data.exp < Date.now() / 1000) return null;
    return { userId: "demo-admin", email: data.email, name: "Admin", role: "store_owner", storeId: SEED_STORE.id };
  } catch {
    return null;
  }
}

/** Current staff session (memoized per request). */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  return isSupabaseConfigured() ? loadSupabaseSession() : loadDemoSession();
});

/** For pages: redirect to the login screen when not signed in. */
export async function requireAdmin(locale: Locale): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  return session;
}

/** For server actions: throw instead of redirecting. */
export async function assertAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export function actorOf(session: AdminSession): Actor {
  return { userId: session.userId, name: session.name };
}
