import { generateObject } from "ai";
import { z } from "zod";
import { RECOMMENDATION_MODEL } from "./model";

export const GARMENT_CATEGORY = ["top", "bottom", "dress", "outerwear", "shoes", "accessory"] as const;

export const recommendedPieceSchema = z.object({
  category: z.enum(GARMENT_CATEGORY),
  color: z.string().describe("A specific, named color, e.g. 'warm camel' or 'ink navy'."),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .describe("Best-guess hex value for the named color, for swatch rendering."),
  silhouette: z
    .string()
    .describe("Fit/shape, e.g. 'relaxed straight-leg', 'fitted cropped', 'A-line'."),
  reasoning: z
    .string()
    .describe("One short sentence on why this works with the body shape and the rest of the outfit."),
  searchQuery: z
    .string()
    .describe(
      "A short English shopping-search query for this exact piece (e.g. 'beige oversized knit cardigan'), " +
        "written the way it would appear as a product title on an online fashion retailer — always in English " +
        "regardless of what language the rest of the response is in, so it matches real listings.",
    ),
  wardrobeItemId: z
    .string()
    .optional()
    .describe(
      "Only set in wardrobe mode: the exact id of the user's existing wardrobe item this piece refers to, " +
        "copied verbatim from the wardrobe list. Omit entirely for newly suggested shopping pieces.",
    ),
});

export const identifiedGarmentSchema = z.object({
  category: z.enum(GARMENT_CATEGORY),
  color: z.string().describe("The dominant color of the garment in the photo, in Traditional Chinese."),
  pattern: z.string().describe("e.g. '素色', '條紋', '格紋', '印花' — in Traditional Chinese."),
  silhouette: z.string().describe("Fit/shape of the garment in the photo, in Traditional Chinese."),
  description: z
    .string()
    .describe("One short sentence in Traditional Chinese describing the garment, to confirm to the user what was recognized."),
});

export const outfitRecommendationSchema = z.object({
  identifiedGarment: identifiedGarmentSchema
    .optional()
    .describe("Only present when the input was a photo of a garment — what was recognized in it."),
  styleSummary: z
    .string()
    .describe("One or two sentences describing the overall look and mood."),
  palette: z
    .array(
      z.object({
        name: z.string().describe("A specific, named color, e.g. '炭灰色' or '焦糖棕'."),
        hex: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .describe("Best-guess hex value for the named color, for swatch rendering."),
      }),
    )
    .describe("3-5 named colors that work together for this outfit."),
  pieces: z
    .array(recommendedPieceSchema)
    .min(2)
    .max(5)
    .describe("Complementary pieces to pair with the input, excluding the input item itself."),
  avoid: z
    .array(z.string())
    .describe("1-3 short notes on colors/silhouettes to avoid for this body shape/occasion."),
});

export type OutfitRecommendation = z.infer<typeof outfitRecommendationSchema>;

export interface BodyProfileInput {
  heightCm?: number | null;
  bodyShape?: string | null;
  gender?: string | null;
}

export interface WeatherInput {
  tempC: number;
  condition: string;
}

export interface OccasionInput {
  activity?: string;
  mood?: string;
}

export interface WardrobeItemInput {
  id: string;
  category: (typeof GARMENT_CATEGORY)[number];
  color: string;
  pattern?: string | null;
  silhouette?: string | null;
}

export type RecommendationInput =
  | {
      mode: "garment";
      /** Data URL (data:image/...;base64,...) of a photo the user took of the garment. Optional — without one this behaves like a from-scratch outfit built purely from activity/mood/weather. */
      imageDataUrl?: string;
      activity?: string;
      mood?: string;
      body?: BodyProfileInput;
      weather?: WeatherInput;
    }
  | {
      mode: "wardrobe";
      wardrobeItems: WardrobeItemInput[];
      activity?: string;
      mood?: string;
      body?: BodyProfileInput;
      weather?: WeatherInput;
    };

function describeBody(body?: BodyProfileInput) {
  if (!body || (!body.heightCm && !body.bodyShape)) {
    return "No body measurement data provided — give generally flattering, versatile advice.";
  }
  const parts: string[] = [];
  if (body.heightCm) parts.push(`height ${body.heightCm}cm`);
  if (body.bodyShape) parts.push(`body shape: ${body.bodyShape}`);
  if (body.gender) parts.push(`gender presentation: ${body.gender}`);
  return `Body profile — ${parts.join(", ")}.`;
}

function describeWeather(weather?: WeatherInput) {
  if (!weather) return "";
  return `\nCurrent weather: ${weather.tempC}°C, ${weather.condition}. Factor this into fabric weight, layering, and whether rain/sun protection pieces (e.g. a light jacket, umbrella-friendly outerwear, breathable fabric) are warranted — mention it in the reasoning where relevant.`;
}

/**
 * Activity/mood is the primary driver of every recommendation (as important
 * as weather) — this phrasing is shared across the garment-photo and
 * wardrobe modes so it's never an afterthought.
 */
function describeOccasion(occasion?: OccasionInput) {
  if (!occasion || (!occasion.activity && !occasion.mood)) {
    return "No specific activity or mood given — pick a versatile, generally flattering combination.";
  }
  const parts: string[] = [];
  if (occasion.activity) parts.push(`activity: "${occasion.activity}"`);
  if (occasion.mood) parts.push(`mood: "${occasion.mood}"`);
  return `Today's ${parts.join(", ")}. This is the PRIMARY driver of the recommendation — the occasion and mood should shape color, formality, and silhouette choices at least as much as the weather does.`;
}

const SYSTEM_PROMPT =
  "You are a friendly, practical personal stylist for everyday consumers (not high fashion editors, and not people who know fashion terminology). " +
  "You give concrete, specific color and silhouette advice people can act on immediately, and briefly explain the 'why' in terms of body shape, color harmony, and occasion. " +
  "Write every field in Traditional Chinese (繁體中文), EXCEPT `searchQuery`, which must always be English shopping-search keywords.";

/** Lighter single-purpose vision call used when saving a photo to the wardrobe (no recommendation needed yet). */
export async function identifyGarmentFromPhoto(
  imageDataUrl: string,
): Promise<z.infer<typeof identifiedGarmentSchema>> {
  const { object } = await generateObject({
    model: RECOMMENDATION_MODEL,
    schema: identifiedGarmentSchema,
    system:
      "You identify clothing items from photos for an everyday consumer app. " +
      "Write every field in Traditional Chinese (繁體中文).",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Identify the main clothing item in this photo." },
          { type: "file", mediaType: "image", data: imageDataUrl },
        ],
      },
    ],
  });
  return object;
}

function describeWardrobe(items: WardrobeItemInput[]) {
  return items
    .map(
      (item) =>
        `- id="${item.id}" | category: ${item.category} | color: ${item.color}` +
        (item.pattern ? ` | pattern: ${item.pattern}` : "") +
        (item.silhouette ? ` | silhouette: ${item.silhouette}` : ""),
    )
    .join("\n");
}

export async function generateOutfitRecommendation(
  input: RecommendationInput,
): Promise<OutfitRecommendation> {
  const bodyLine = describeBody(input.body);
  const weatherLine = describeWeather(input.weather);
  const occasionLine = describeOccasion(input);

  if (input.mode === "garment") {
    if (input.imageDataUrl) {
      const { object } = await generateObject({
        model: RECOMMENDATION_MODEL,
        schema: outfitRecommendationSchema,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `A user uploaded a photo of a clothing item they own or plan to wear. The user may not know fashion terminology, so identify the garment yourself: fill in \`identifiedGarment\` (category, color, pattern, silhouette, and a one-sentence description confirming what you see).

${occasionLine}
${bodyLine}${weatherLine}
Then recommend complementary pieces (colors + silhouettes) to pair with it, tailored to their body profile and the occasion/mood above. Do not re-suggest the same category as the identified item. Keep tone practical and wearable for an everyday person.`,
              },
              {
                type: "file",
                mediaType: "image",
                data: input.imageDataUrl,
              },
            ],
          },
        ],
      });
      return object;
    }

    const prompt = `A user is getting dressed and has not provided a specific garment photo — design a complete outfit from scratch.
${occasionLine}
${bodyLine}${weatherLine}
Suggest complementary pieces (do not invent a base piece — just design the full outfit) with specific colors and silhouettes, tailored to their body profile. Leave \`identifiedGarment\` unset — there was no photo. Keep tone practical and wearable for an everyday person, not high fashion editorial.`;

    const { object } = await generateObject({
      model: RECOMMENDATION_MODEL,
      schema: outfitRecommendationSchema,
      system: SYSTEM_PROMPT,
      prompt,
    });
    return object;
  }

  const prompt = `A user wants an outfit built from clothes they already own. Here is their wardrobe:
${describeWardrobe(input.wardrobeItems)}

${occasionLine}
${bodyLine}${weatherLine}
Pick the best combination of EXISTING wardrobe items to form a complete outfit — at minimum a top and a bottom (or a dress), reusing their exact id, color, pattern, and silhouette as given (do not invent new attributes for them), and set \`wardrobeItemId\` on each. Only if a category essential to completing the look (e.g. shoes, outerwear for cold weather) is entirely missing from the wardrobe, you may add at most 1-2 NEW shopping suggestions for those gaps — leave \`wardrobeItemId\` unset for those. Prefer using only what they already own.`;

  const { object } = await generateObject({
    model: RECOMMENDATION_MODEL,
    schema: outfitRecommendationSchema,
    system: SYSTEM_PROMPT,
    prompt,
  });
  return object;
}
