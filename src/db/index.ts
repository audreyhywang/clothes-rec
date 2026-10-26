import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";

// Lazy singleton: avoids crashing `next build` when DATABASE_URL isn't
// available yet (e.g. first deploy before env vars are pulled), since
// Next.js evaluates top-level module code at build time.
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Pins pg-connection-string to libpq's `sslmode=require` semantics
 * explicitly, instead of letting it fall back to the deprecated
 * prefer/require-as-verify-full alias — removes the "SECURITY WARNING"
 * pg prints on every connection without changing actual TLS behavior.
 */
function withLibpqSslCompat(connectionString: string) {
  const url = new URL(connectionString);
  if (!url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }
  return url.toString();
}

function createPool() {
  const pool = new Pool({
    connectionString: withLibpqSslCompat(process.env.DATABASE_URL!),
  });
  // Lets Fluid Compute close idle connections gracefully on function suspend.
  attachDatabasePool(pool);
  return pool;
}

export function getDb() {
  if (!_db) {
    _pool = createPool();
    _db = drizzle(_pool, { schema });
  }
  return _db;
}
