import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { devices, pairingCodes } from "@/db/schema";
import { PAIRING_CODE_TTL_MS, redeemPairingCode } from "@/lib/auth/devices";
import { createPairingCode, parseOptions } from "./create-pairing-code.mjs";

// The script writes with plain SQL; use the same in-memory database the app modules use.
const sqlite = db.$client;

beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-21T12:00:00Z"));
    await db.delete(devices);
    await db.delete(pairingCodes);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("parseOptions", () => {
    it("creates a regular code by default", () => {
        expect(parseOptions([])).toEqual({ isAdmin: false });
    });

    it("creates an admin code with --admin", () => {
        expect(parseOptions(["--admin"])).toEqual({ isAdmin: true });
    });

    it("rejects unknown arguments, so a typo does not create the wrong kind of code", () => {
        expect(() => parseOptions(["--amdin"])).toThrow("--amdin");
    });
});

describe("createPairingCode from the command line", () => {
    it("creates a readable code in the same format as the app", () => {
        const { code } = createPairingCode(sqlite);
        expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    });

    it("creates a code the app accepts", async () => {
        const { code } = createPairingCode(sqlite);
        const paired = await redeemPairingCode(code, "Pixel 8");
        expect(paired?.device.isAdmin).toBe(false);
    });

    it("creates an admin code that pairs an admin device", async () => {
        const { code } = createPairingCode(sqlite, { isAdmin: true });
        const paired = await redeemPairingCode(code, "Můj telefon");
        expect(paired?.device.isAdmin).toBe(true);
    });

    it("is valid exactly as long as codes created in the app", async () => {
        const { code, expiresAt } = createPairingCode(sqlite);
        expect(expiresAt.getTime()).toBe(Date.now() + PAIRING_CODE_TTL_MS);

        vi.advanceTimersByTime(PAIRING_CODE_TTL_MS + 1000);
        expect(await redeemPairingCode(code, "Pixel 8")).toBeNull();
    });

    it("stores only a hash of the code", () => {
        const { code } = createPairingCode(sqlite);
        const stored = JSON.stringify(sqlite.prepare("SELECT * FROM pairing_codes").all());
        expect(stored).not.toContain(code.replace("-", ""));
    });
});
