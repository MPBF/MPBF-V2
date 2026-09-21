import { Pool, neonConfig } from "@neondatabase/serverless";
import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const MAIN_POOL_MAX = Number(process.env.DB_POOL_MAX ?? 10);
const SESSION_POOL_MAX = Number(process.env.DB_SESSION_POOL_MAX ?? 3);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: MAIN_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

const TRANSIENT_CODES = new Set(["57P01", "ECONNRESET", "ETIMEDOUT", "08006", "08003"]);
const TRANSIENT_MESSAGE_RE =
  /socket hang up|terminating connection|Connection terminated|ECONNRESET|ECONNREFUSED/i;

export function isTransientDbError(err: unknown): boolean {
  const code = (err as any)?.code;
  const msg = String((err as any)?.message ?? "");
  return (typeof code === "string" && TRANSIENT_CODES.has(code)) || TRANSIENT_MESSAGE_RE.test(msg);
}

pool.on("error", (err: Error) => {
  if (isTransientDbError(err)) {
    console.warn("⚠️ Transient DB pool error (will reconnect):", err.message);
    return;
  }
  console.error("🔴 Database pool error (non-fatal):", err.message);
  console.error("📍 Error code:", (err as any).code || "Unknown");
});

export const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: SESSION_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

sessionPool.on("error", (err: Error) => {
  if (isTransientDbError(err)) {
    return;
  }
  console.error("🔴 Session pool error (non-fatal):", err.message);
});

export const db = drizzle({ client: pool, schema });

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; label?: string } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message ?? "");
      const transient = isTransientDbError(err);
      if (!transient || attempt === retries) throw err;
      const delay = 50 * Math.pow(2, attempt);
      console.warn(
        `⚠️ DB transient error${opts.label ? ` [${opts.label}]` : ""} (attempt ${attempt + 1}/${retries + 1}): ${msg}. Retrying in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
