import { generateObject } from "ai";
import { z } from "zod";
import { NEWS_SUMMARY_MODEL } from "./model";

export const newsSummarySchema = z.object({
  summary: z
    .string()
    .describe("2-3 sentence plain-language summary of the trend/article for an everyday reader."),
  tags: z
    .array(z.string())
    .min(1)
    .max(6)
    .describe("Short lowercase tags, e.g. 'colorways', 'denim', 'y2k-revival', 'workwear'."),
});

export type NewsSummary = z.infer<typeof newsSummarySchema>;

/**
 * Summarizes one raw news item (title + feed snippet) into a tagged digest entry.
 * Kept to a single small model call per item — cheap and parallelizable.
 */
export async function summarizeFashionItem(input: {
  title: string;
  snippet: string;
  sourceName: string;
}): Promise<NewsSummary> {
  const { object } = await generateObject({
    model: NEWS_SUMMARY_MODEL,
    schema: newsSummarySchema,
    system:
      "You distill fashion industry news into short, plain-language takeaways for " +
      "everyday consumers who want to know 'what's trending right now' — no jargon, no hype. " +
      "Write `summary` in Traditional Chinese (繁體中文). Keep `tags` short, lowercase, English.",
    prompt: `Source: ${input.sourceName}
Title: ${input.title}
Snippet: ${input.snippet}

Summarize the key styling/trend takeaway from this.`,
  });

  return object;
}
