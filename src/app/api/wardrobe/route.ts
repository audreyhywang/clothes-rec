import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { wardrobeItems } from "@/db/schema";
import { getOrCreateSessionId } from "@/lib/session";
import { identifyGarmentFromPhoto } from "@/lib/ai/recommend";

const bodySchema = z.object({
  imageDataUrl: z
    .string()
    .startsWith("data:image/")
    .max(4_000_000, "圖片太大，請重新拍攝或選擇較小的照片"),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sessionId = await getOrCreateSessionId();
  const identified = await identifyGarmentFromPhoto(parsed.data.imageDataUrl);

  const db = getDb();
  const [saved] = await db
    .insert(wardrobeItems)
    .values({
      sessionId,
      name: identified.description,
      category: identified.category,
      color: identified.color,
      pattern: identified.pattern,
      silhouette: identified.silhouette,
      imageUrl: parsed.data.imageDataUrl,
    })
    .returning();

  return Response.json({ item: saved });
}

export async function GET() {
  const sessionId = await getOrCreateSessionId();
  const db = getDb();

  const items = await db
    .select()
    .from(wardrobeItems)
    .where(eq(wardrobeItems.sessionId, sessionId))
    .orderBy(desc(wardrobeItems.createdAt));

  const hasTop = items.some((item) => item.category === "top" || item.category === "dress");
  const hasBottom = items.some((item) => item.category === "bottom" || item.category === "dress");

  return Response.json({
    items,
    unlocked: hasTop && hasBottom,
  });
}
