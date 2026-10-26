import { Suspense } from "react";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { fashionNewsDigest } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshNewsButton } from "@/components/news/refresh-button";

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium" }).format(date);
}

async function NewsFeed() {
  const db = getDb();
  const entries = await db
    .select()
    .from(fashionNewsDigest)
    .orderBy(desc(fashionNewsDigest.publishedAt))
    .limit(30);

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          還沒有任何資訊，點擊「立即更新」讓 AI 代理抓取最新時尚新聞。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{entry.title}</CardTitle>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(entry.publishedAt)}
              </span>
            </div>
            <CardDescription>{entry.sourceName}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm">{entry.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {(entry.tags ?? []).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
            {entry.sourceUrl && (
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline underline-offset-2"
              >
                閱讀原文
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NewsFeedSkeleton() {
  return (
    <div className="grid gap-4">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/4" />
          </CardHeader>
          <CardContent className="grid gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">時尚資訊</h1>
          <p className="text-sm text-muted-foreground">
            由 AI 代理定期彙整的最新時尚新聞與穿搭理念。
          </p>
        </div>
        <RefreshNewsButton />
      </div>

      <Suspense fallback={<NewsFeedSkeleton />}>
        <NewsFeed />
      </Suspense>
    </div>
  );
}
