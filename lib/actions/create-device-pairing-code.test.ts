import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { db } from "@/db";
import { devices, pairingCodes } from "@/db/schema";
import { createDevicePairingCode } from "@/lib/actions/create-device-pairing-code";
import { PAIRING_CODE_TTL_MS, createPairingCode, redeemPairingCode } from "@/lib/auth/devices";
import { DEVICE_COOKIE_NAME } from "@/lib/auth/session";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT ${url}`);
    }),
}));

const NOW = new Date("2026-11-22T12:00:00Z");

let cookieJar: Map<string, string>;

beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);

    await db.delete(devices);
    await db.delete(pairingCodes);

    cookieJar = new Map();
    vi.mocked(cookies).mockResolvedValue({
        get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
        set: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);
});

afterEach(() => {
    vi.useRealTimers();
});

async function signInAs(name: string, options: { isAdmin?: boolean } = {}) {
    const { code } = await createPairingCode(options);
    const paired = await redeemPairingCode(code, name);
    if (!paired) throw new Error("pairing failed");
    cookieJar.set(DEVICE_COOKIE_NAME, paired.token);
    // The sign-in code is used up, so only codes created by the test remain.
    expect(await db.select().from(pairingCodes)).toHaveLength(0);
}

function codeForm(fields: { isAdmin?: string } = {}) {
    const formData = new FormData();
    if (fields.isAdmin !== undefined) formData.set("isAdmin", fields.isAdmin);
    return formData;
}

describe("createDevicePairingCode by an admin", () => {
    beforeEach(() => signInAs("Admin", { isAdmin: true }));

    it("returns a code in the XXXX-XXXX format with its expiry", async () => {
        const state = await createDevicePairingCode({}, codeForm());

        expect(state.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
        expect(state.expiresAt).toEqual(new Date(NOW.getTime() + PAIRING_CODE_TTL_MS));
    });

    it("creates a regular code by default, which pairs a regular device", async () => {
        const state = await createDevicePairingCode({}, codeForm());

        expect(state.isAdmin).toBe(false);
        const paired = await redeemPairingCode(state.code!, "Mámin telefon");
        expect(paired?.device.isAdmin).toBe(false);
    });

    it('creates an admin code when the "isAdmin" checkbox is ticked', async () => {
        const state = await createDevicePairingCode({}, codeForm({ isAdmin: "on" }));

        expect(state.isAdmin).toBe(true);
        const paired = await redeemPairingCode(state.code!, "Druhý admin");
        expect(paired?.device.isAdmin).toBe(true);
    });

    it("creates a new code every time, the previous one stays valid", async () => {
        const first = await createDevicePairingCode({}, codeForm());
        const second = await createDevicePairingCode(first, codeForm());

        expect(second.code).not.toBe(first.code);
        expect(await redeemPairingCode(first.code!, "Mámin telefon")).not.toBeNull();
        expect(await redeemPairingCode(second.code!, "Tátův telefon")).not.toBeNull();
    });
});

describe("createDevicePairingCode without admin rights", () => {
    it("sends a regular device back to the recipes without creating a code", async () => {
        await signInAs("Mámin telefon");

        await expect(createDevicePairingCode({}, codeForm({ isAdmin: "on" }))).rejects.toThrow(/^NEXT_REDIRECT \/$/);

        expect(await db.select().from(pairingCodes)).toHaveLength(0);
    });

    it("redirects an unpaired browser to /pair without creating a code", async () => {
        await expect(createDevicePairingCode({}, codeForm({ isAdmin: "on" }))).rejects.toThrow("NEXT_REDIRECT /pair");

        expect(await db.select().from(pairingCodes)).toHaveLength(0);
    });
});
