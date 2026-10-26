import { google } from "@ai-sdk/google";

/**
 * Single place to change the model used across the app.
 * Direct Google provider (not the Vercel AI Gateway) — avoids needing a
 * card on file with Vercel. Requires GOOGLE_GENERATIVE_AI_API_KEY, a free
 * key from https://aistudio.google.com/apikey.
 */
export const RECOMMENDATION_MODEL = google("gemini-flash-lite-latest");
export const NEWS_SUMMARY_MODEL = google("gemini-flash-lite-latest");
