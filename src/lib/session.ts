import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";

const SESSION_COOKIE = "session_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Read-only lookup for Server Components (page.tsx render), where
 * Next.js forbids writing cookies. Returns null if the visitor has no
 * session yet — pages should render their "nothing saved yet" state in
 * that case. The cookie is only ever created via `getOrCreateSessionId`
 * from a Route Handler or Server Action, so a present cookie can be
 * trusted to reference an existing `sessions` row.
 */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Anonymous, no-login session identity. Every browser gets a UUID cookie
 * the first time it hits an API route; all measurements, wardrobe items,
 * and recommendations are keyed off it. Upgradeable to real auth later
 * without changing the schema (the sessionId stays the foreign key).
 *
 * Writes a cookie, so this must only be called from a Route Handler or
 * Server Action — calling it from a page's render throws.
 */
export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;

  const db = getDb();

  if (existing) {
    const [row] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.id, existing))
      .limit(1);
    if (row) return row.id;
  }

  const [created] = await db.insert(sessions).values({}).returning();

  cookieStore.set(SESSION_COOKIE, created.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });

  return created.id;
}
