import { Suspense } from "react";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { bodyMeasurements } from "@/db/schema";
import { getSessionId } from "@/lib/session";
import { MeasurementsForm, type MeasurementFormValues } from "@/components/measurements/measurements-form";
import { Skeleton } from "@/components/ui/skeleton";

async function MeasurementsPageContent() {
  const sessionId = await getSessionId();
  const db = getDb();

  const [latest] = sessionId
    ? await db
        .select()
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.sessionId, sessionId))
        .orderBy(desc(bodyMeasurements.createdAt))
        .limit(1)
    : [];

  const initial: Partial<MeasurementFormValues> = latest
    ? {
        heightCm: latest.heightCm ?? "",
        weightKg: latest.weightKg ?? "",
        bustCm: latest.bustCm ?? "",
        waistCm: latest.waistCm ?? "",
        hipCm: latest.hipCm ?? "",
        shoulderCm: latest.shoulderCm ?? "",
        inseamCm: latest.inseamCm ?? "",
        bodyShape: latest.bodyShape ?? "",
        gender: latest.gender ?? "",
      }
    : {};

  return <MeasurementsForm initial={initial} />;
}

export default function MeasurementsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-xl" />}>
        <MeasurementsPageContent />
      </Suspense>
    </div>
  );
}
