import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

// `next build` imports this module from parallel workers. Opened on a shared file they lock each
// other out ("database is locked" while switching to WAL, even with busy_timeout), and every
// route that reads data is dynamic anyway, so the build gets a private, empty in-memory database.
const isBuilding = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;

const sqlite = new Database(isBuilding ? ":memory:" : (process.env.DATABASE_PATH ?? "umai.db"));
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

if (!isBuilding) {
    migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}
