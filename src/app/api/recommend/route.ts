import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { bodyMeasurements, outfitRecommendations, wardrobeItems } from "@/db/schema";
import { generateOutfitRecommendation, GARMENT_CATEGORY } from "@/lib/ai/recommend";
import { getOrCreateSessionId } from "@/lib/session";

const weatherSchema = z.object({
  tempC: z.number().min(-60).max(60),
  condition: z.string().min(1).max(32),
});

const bodySchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("garment"),
      imageDataUrl: z
        .string()
        .startsWith("data:image/")
        .max(4_000_000, "圖片太大，請重新拍攝或選擇較小的照片")
        .optional(),
      activity: z.string().max(200).optional(),
      mood: z.string().max(200).optional(),
      weather: weatherSchema.optional(),
    })
    .refine((v) => v.imageDataUrl || v.activity, {
      message: "請上傳照片，或至少填寫今天的活動",
    }),
  z.object({
    mode: z.literal("wardrobe"),
    activity: z.string().max(200).optional(),
    mood: z.string().max(200).optional(),
    weather: weatherSchema.optional(),
  }),
]);

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const db = getDb();
  const sessionId = await getOrCreateSessionId();

  const [latestMeasurement] = await db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.sessionId, sessionId))
    .orderBy(desc(bodyMeasurements.createdAt))
    .limit(1);

  const body = latestMeasurement
    ? {
        heightCm: latestMeasurement.heightCm ? Number(latestMeasurement.heightCm) : null,
        bodyShape: latestMeasurement.bodyShape,
        gender: latestMeasurement.gender,
      }
    : undefined;

  let recommendationInput: Parameters<typeof generateOutfitRecommendation>[0];

  if (input.mode === "garment") {
    recommendationInput = {
      mode: "garment",
      imageDataUrl: input.imageDataUrl,
      activity: input.activity,
      mood: input.mood,
      body,
      weather: input.weather,
    };
  } else {
    const wardrobe = await db
      .select()
      .from(wardrobeItems)
      .where(eq(wardrobeItems.sessionId, sessionId))
      .orderBy(desc(wardrobeItems.createdAt));

    const hasTop = wardrobe.some((item) => item.category === "top" || item.category === "dress");
    const hasBottom = wardrobe.some((item) => item.category === "bottom" || item.category === "dress");
    if (!hasTop || !hasBottom) {
      return Response.json(
        { error: "衣櫃至少需要 1 件上衣（或洋裝）和 1 件下身才能使用這個功能" },
        { status: 400 },
      );
    }

    recommendationInput = {
      mode: "wardrobe",
      wardrobeItems: wardrobe.map((item) => ({
        id: item.id,
        category: item.category as (typeof GARMENT_CATEGORY)[number],
        color: item.color,
        pattern: item.pattern,
        silhouette: item.silhouette,
      })),
      activity: input.activity,
      mood: input.mood,
      body,
      weather: input.weather,
    };
  }

  const result = await generateOutfitRecommendation(recommendationInput);

  const [saved] = await db
    .insert(outfitRecommendations)
    .values({
      sessionId,
      inputType: input.mode,
      activity: input.activity ?? null,
      mood: input.mood ?? null,
      resultJson: result,
    })
    .returning();

  return Response.json({ id: saved.id, result });
}

export async function GET() {
  const db = getDb();
  const sessionId = await getOrCreateSessionId();

  const history = await db
    .select()
    .from(outfitRecommendations)
    .where(eq(outfitRecommendations.sessionId, sessionId))
    .orderBy(desc(outfitRecommendations.createdAt))
    .limit(20);

  const wardrobe = await db
    .select()
    .from(wardrobeItems)
    .where(eq(wardrobeItems.sessionId, sessionId))
    .orderBy(desc(wardrobeItems.createdAt));

  return Response.json({ history, wardrobe });
}
