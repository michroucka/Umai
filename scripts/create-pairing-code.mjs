// Creates a one-time pairing code from the command line, e.g. for the very first (admin) device:
//
//   docker compose exec umai node scripts/create-pairing-code.mjs --admin
//   npm run pairing-code -- --admin
//
// Plain JavaScript on purpose: the production image is a Next.js standalone build without
// TypeScript or the @/ aliases. The code format, hashing and lifetime must match
// lib/auth/devices.ts; create-pairing-code.test.ts redeems a code from here with that module.

import { createHash, randomInt } from "node:crypto";
import { pathToFileURL } from "node:url";
import Database from "better-sqlite3";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAIRING_CODE_TTL_MS = 15 * 60 * 1000;
const USAGE = "Použití: node scripts/create-pairing-code.mjs [--admin]";

/**
 * @param {string[]} args command line arguments without the node binary and the script path
 * @returns {{ isAdmin: boolean }}
 */
export function parseOptions(args) {
    const unknown = args.filter((arg) => arg !== "--admin");
    if (unknown.length > 0) {
        throw new Error(`Neznámý argument: ${unknown.join(" ")}\n${USAGE}`);
    }
    return { isAdmin: args.includes("--admin") };
}

function generateCode() {
    const chars = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

function hashCode(code) {
    const normalized = code.replace(/[\s-]/g, "").toUpperCase();
    return createHash("sha256").update(normalized).digest("hex");
}

/**
 * @param {import("better-sqlite3").Database} sqlite
 * @param {{ isAdmin?: boolean }} options
 * @returns {{ code: string, expiresAt: Date }}
 */
export function createPairingCode(sqlite, { isAdmin = false } = {}) {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);

    sqlite
        .prepare("INSERT INTO pairing_codes (code_hash, is_admin, expires_at) VALUES (?, ?, ?)")
        .run(hashCode(code), isAdmin ? 1 : 0, expiresAt.getTime());

    return { code, expiresAt };
}

function main() {
    const { isAdmin } = parseOptions(process.argv.slice(2));
    const sqlite = new Database(process.env.DATABASE_PATH ?? "umai.db", { fileMustExist: true });

    try {
        const { code } = createPairingCode(sqlite, { isAdmin });
        console.log(`Párovací kód${isAdmin ? " (admin)" : ""}: ${code}`);
        console.log(`Platí ${PAIRING_CODE_TTL_MS / 60_000} minut a jen jednou. Zadej ho v aplikaci na stránce /pair.`);
    } finally {
        sqlite.close();
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        main();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("unable to open database file")) {
            console.error(`Databáze ${process.env.DATABASE_PATH ?? "umai.db"} neexistuje. Zkontroluj DATABASE_PATH.`);
        } else if (message.includes("no such table")) {
            console.error("Databáze ještě není připravená. Spusť nejdřív aplikaci, ať proběhnou migrace.");
        } else {
            console.error(message);
        }
        process.exit(1);
    }
}
