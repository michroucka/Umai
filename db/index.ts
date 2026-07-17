import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const sqlite = new Database(process.env.DATABASE_PATH ?? "umai.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite, { schema });

if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}
