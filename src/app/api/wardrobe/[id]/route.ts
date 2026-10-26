import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { wardrobeItems } from "@/db/schema";
import { getOrCreateSessionId } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = await getOrCreateSessionId();
  const db = getDb();

  await db
    .delete(wardrobeItems)
    .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.sessionId, sessionId)));

  return Response.json({ ok: true });
}
