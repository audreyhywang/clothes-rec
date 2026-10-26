import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { fashionNewsDigest } from "@/db/schema";
import { fetchFashionFeedItems } from "@/lib/fashion-feeds";
import { summarizeFashionItem } from "@/lib/ai/news-summarize";

// Generous ceiling: fetching several RSS feeds + summarizing each new item
// with an LLM call can take a while, but all of it is I/O wait (no Active
// CPU cost while awaiting), so a long maxDuration is cheap.
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // not configured yet — allow (dev convenience)
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const items = await fetchFashionFeedItems({ perFeedLimit: 6 });

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      const existing = await db
        .select({ id: fashionNewsDigest.id })
        .from(fashionNewsDigest)
        .where(eq(fashionNewsDigest.sourceUrl, item.sourceUrl))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const { summary, tags } = await summarizeFashionItem({
        title: item.title,
        snippet: item.snippet,
        sourceName: item.sourceName,
      });

      await db.insert(fashionNewsDigest).values({
        title: item.title,
        summary,
        tags,
        sourceUrl: item.sourceUrl,
        sourceName: item.sourceName,
        publishedAt: item.publishedAt,
      });
      inserted++;
    } catch (err) {
      errors.push(`${item.sourceName} — ${item.title}: ${(err as Error).message}`);
    }
  }

  return Response.json({ inserted, skipped, totalFetched: items.length, errors });
}
