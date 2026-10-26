import { defineConfig } from "drizzle-kit";

// Migrations must run against the direct (non-pooled) connection string —
// Neon's pooled PgBouncer connection doesn't support the session-level
// operations drizzle-kit needs.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
});
