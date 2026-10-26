import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Anonymous session — every visitor gets one, identified by a cookie.
 * No login required for the MVP; this is the join key for everything
 * a given browser has entered.
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Body measurements a user has entered, used to:
 *  - shape the 3D avatar
 *  - bias outfit/silhouette recommendations
 * We keep history (createdAt) but the app only reads the latest row per session.
 */
export const bodyMeasurements = pgTable("body_measurements", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }).notNull(),
  weightKg: numeric("weight_kg", { precision: 5, scale: 1 }),
  bustCm: numeric("bust_cm", { precision: 5, scale: 1 }),
  waistCm: numeric("waist_cm", { precision: 5, scale: 1 }),
  hipCm: numeric("hip_cm", { precision: 5, scale: 1 }),
  shoulderCm: numeric("shoulder_cm", { precision: 5, scale: 1 }),
  inseamCm: numeric("inseam_cm", { precision: 5, scale: 1 }),
  bodyShape: varchar("body_shape", { length: 32 }), // e.g. "apple" | "pear" | "hourglass" | "rectangle" | "inverted_triangle"
  gender: varchar("gender", { length: 16 }), // self-described, optional, free-ish enum for avatar base mesh
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * A garment the user owns or is considering wearing today.
 * Used as the "I already picked this piece" input to the recommender.
 */
export const wardrobeItems = pgTable("wardrobe_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: varchar("category", { length: 32 }).notNull(), // top | bottom | dress | outerwear | shoes | accessory
  color: varchar("color", { length: 32 }).notNull(),
  pattern: varchar("pattern", { length: 32 }), // solid | striped | floral | plaid | ...
  silhouette: varchar("silhouette", { length: 32 }), // fitted | relaxed | oversized | a-line | straight ...
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * One generated recommendation, keyed either by activity+mood or by a base garment.
 * `resultJson` holds the structured AI output (suggested pieces, colors, silhouettes, reasoning)
 * so the UI never has to re-derive it and we keep a history per session.
 */
export const outfitRecommendations = pgTable("outfit_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  inputType: varchar("input_type", { length: 16 }).notNull(), // "activity_mood" | "garment"
  activity: text("activity"),
  mood: text("mood"),
  baseGarmentId: uuid("base_garment_id").references(() => wardrobeItems.id, {
    onDelete: "set null",
  }),
  resultJson: jsonb("result_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Digest entries written by the scheduled fashion-news AI agent (Vercel Cron).
 * Each row is one summarized trend/article, shown on the news feed page.
 */
export const fashionNewsDigest = pgTable("fashion_news_digest", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  sourceUrl: text("source_url"),
  sourceName: varchar("source_name", { length: 120 }),
  tags: jsonb("tags").$type<string[]>().default([]),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
