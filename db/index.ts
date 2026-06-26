import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

const sqlite = new Database(process.env.DATABASE_PATH ?? "umai.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
