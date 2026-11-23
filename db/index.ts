import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const sqlite = new Database(process.env.DATABASE_PATH ?? "umai.db");
// busy_timeout goes first: `next build` opens the database from parallel workers, and switching
// the journal mode without it fails at once with "database is locked" instead of waiting.
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
    migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}
