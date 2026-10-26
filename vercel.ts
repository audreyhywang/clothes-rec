import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  // Fetches fashion RSS feeds, summarizes new items with AI, stores digest
  // entries. Twice a day keeps the news feed fresh without burning model
  // calls on every item every run (de-duped by sourceUrl anyway).
  crons: [{ path: "/api/cron/fashion-news", schedule: "0 6,18 * * *" }],
};
