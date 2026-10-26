import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { bodyMeasurements } from "@/db/schema";
import { getOrCreateSessionId } from "@/lib/session";

const measurementSchema = z.object({
  heightCm: z.coerce.number().min(100).max(230),
  weightKg: z.coerce.number().min(25).max(250).optional(),
  bustCm: z.coerce.number().min(50).max(180).optional(),
  waistCm: z.coerce.number().min(40).max(180).optional(),
  hipCm: z.coerce.number().min(50).max(200).optional(),
  shoulderCm: z.coerce.number().min(25).max(70).optional(),
  inseamCm: z.coerce.number().min(40).max(110).optional(),
  bodyShape: z.string().max(32).optional(),
  gender: z.string().max(16).optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = measurementSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sessionId = await getOrCreateSessionId();
  const db = getDb();

  const toStr = (n?: number) => (n === undefined ? undefined : String(n));

  const [saved] = await db
    .insert(bodyMeasurements)
    .values({
      sessionId,
      heightCm: toStr(parsed.data.heightCm)!,
      weightKg: toStr(parsed.data.weightKg),
      bustCm: toStr(parsed.data.bustCm),
      waistCm: toStr(parsed.data.waistCm),
      hipCm: toStr(parsed.data.hipCm),
      shoulderCm: toStr(parsed.data.shoulderCm),
      inseamCm: toStr(parsed.data.inseamCm),
      bodyShape: parsed.data.bodyShape,
      gender: parsed.data.gender,
    })
    .returning();

  return Response.json({ measurement: saved });
}

export async function GET() {
  const sessionId = await getOrCreateSessionId();
  const db = getDb();

  const [latest] = await db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.sessionId, sessionId))
    .orderBy(desc(bodyMeasurements.createdAt))
    .limit(1);

  return Response.json({ measurement: latest ?? null });
}
