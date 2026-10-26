import Parser from "rss-parser";

/**
 * Public RSS feeds from fashion publications. No API key required — this
 * keeps the "track fashion news" agent free to run on a schedule without
 * provisioning a paid search integration. Swap/extend this list freely.
 */
export const FASHION_FEEDS: { name: string; url: string }[] = [
  { name: "Vogue", url: "https://www.vogue.com/feed/rss" },
  { name: "Business of Fashion", url: "https://www.businessoffashion.com/feed/" },
  { name: "WWD", url: "https://wwd.com/feed/" },
  { name: "Harper's Bazaar", url: "https://www.harpersbazaar.com/rss/all.xml/" },
];

export interface RawFeedItem {
  title: string;
  snippet: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt: Date | null;
}

const parser = new Parser();

/**
 * Fetches and flattens all configured feeds. Failures on one feed don't
 * take down the others — each is isolated and logged.
 */
export async function fetchFashionFeedItems(options?: {
  perFeedLimit?: number;
}): Promise<RawFeedItem[]> {
  const perFeedLimit = options?.perFeedLimit ?? 5;

  const results = await Promise.allSettled(
    FASHION_FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items ?? []).slice(0, perFeedLimit).map((item): RawFeedItem => ({
        title: item.title?.trim() ?? "(untitled)",
        snippet:
          (item.contentSnippet || item.content || item.summary || "").slice(0, 600),
        sourceUrl: item.link ?? feed.url,
        sourceName: feed.name,
        publishedAt: item.isoDate ? new Date(item.isoDate) : null,
      }));
    }),
  );

  const items: RawFeedItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      console.error("[fashion-feeds] failed to fetch a feed:", result.reason);
    }
  }
  return items;
}
