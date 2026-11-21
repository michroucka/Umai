import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { devices, pairingCodes } from "@/db/schema";
import { pairDevice } from "@/lib/actions/pair-device";
import { createPairingCode, findDeviceByToken, listDevices, redeemPairingCode } from "@/lib/auth/devices";
import { MAX_FAILED_PAIRING_ATTEMPTS, PAIRING_LOCKOUT_MS } from "@/lib/auth/pairing-limit";
import { DEVICE_COOKIE_NAME, deviceCookieOptions } from "@/lib/auth/session";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT ${url}`);
    }),
}));

const setCookie = vi.fn();
let testStartedAt = new Date("2026-11-21T12:00:00Z").getTime();

beforeEach(async () => {
    // Every test starts a day later, so failed attempts from earlier tests are outside the lockout window.
    testStartedAt += 24 * 60 * 60 * 1000;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(testStartedAt);

    await db.delete(devices);
    await db.delete(pairingCodes);

    setCookie.mockReset();
    vi.mocked(cookies).mockResolvedValue({
        get: () => undefined,
        set: setCookie,
    } as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(redirect).mockClear();
});

afterEach(() => {
    vi.useRealTimers();
});

function pairingForm(fields: { code?: string; name?: string; next?: string }) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) formData.set(key, value);
    }
    return formData;
}

async function submit(fields: { code?: string; name?: string; next?: string }) {
    return pairDevice({}, pairingForm(fields));
}

async function failAttempts(count: number) {
    for (let i = 0; i < count; i++) {
        expect((await submit({ code: "ABCD-EFGH", name: "Útočník" })).error).toBeTruthy();
    }
}

describe("pairDevice with a valid code", () => {
    it("pairs the device, stores its token in the cookie and goes to the recipes", async () => {
        const { code } = await createPairingCode();

        await expect(submit({ code, name: "Pixel 8" })).rejects.toThrow("NEXT_REDIRECT /");

        expect(setCookie).toHaveBeenCalledWith(DEVICE_COOKIE_NAME, expect.any(String), deviceCookieOptions);
        const token = setCookie.mock.calls[0][1];
        expect((await findDeviceByToken(token))?.name).toBe("Pixel 8");
        expect(redirect).toHaveBeenCalledWith("/");
    });

    it("continues to the page from `next`, e.g. a shared recipe link", async () => {
        const { code } = await createPairingCode();
        const next = "/recipes/new?url=https%3A%2F%2Fwww.instagram.com%2Freel%2Fabc";

        await expect(submit({ code, name: "Pixel 8", next })).rejects.toThrow("NEXT_REDIRECT");
        expect(redirect).toHaveBeenCalledWith(next);
    });

    it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "recipes", ""])(
        "ignores an unsafe or empty `next` (%s) and goes to the recipes",
        async (next) => {
            const { code } = await createPairingCode();

            await expect(submit({ code, name: "Pixel 8", next })).rejects.toThrow("NEXT_REDIRECT");
            expect(redirect).toHaveBeenCalledWith("/");
        },
    );
});

describe("pairDevice with invalid input", () => {
    it("returns an error for an unknown code and stays on the page", async () => {
        await createPairingCode();

        const state = await submit({ code: "ABCD-EFGH", name: "Pixel 8" });

        expect(state.error).toBeTruthy();
        expect(setCookie).not.toHaveBeenCalled();
        expect(redirect).not.toHaveBeenCalled();
        expect(await listDevices()).toHaveLength(0);
    });

    it.each([
        ["a missing name", undefined],
        ["an empty name", "   "],
        ["a name over 50 characters", "x".repeat(51)],
    ])("returns an error for %s without using up the code", async (_, name) => {
        const { code } = await createPairingCode();

        const state = await submit({ code, name });

        expect(state.error).toBeTruthy();
        expect(setCookie).not.toHaveBeenCalled();
        expect(await redeemPairingCode(code, "Pixel 8")).not.toBeNull();
    });

    it("returns an error for a missing code", async () => {
        const state = await submit({ name: "Pixel 8" });
        expect(state.error).toBeTruthy();
        expect(setCookie).not.toHaveBeenCalled();
    });

    it("accepts a name of exactly 50 characters", async () => {
        const { code } = await createPairingCode();
        await expect(submit({ code, name: "x".repeat(50) })).rejects.toThrow("NEXT_REDIRECT");
    });
});

describe("pairDevice lockout after failed attempts", () => {
    it("allows a few mistyped codes", () => {
        expect(MAX_FAILED_PAIRING_ATTEMPTS).toBeGreaterThanOrEqual(3);
        expect(MAX_FAILED_PAIRING_ATTEMPTS).toBeLessThanOrEqual(20);
    });

    it("locks pairing for minutes, not days", () => {
        expect(PAIRING_LOCKOUT_MS).toBeGreaterThanOrEqual(5 * 60 * 1000);
        expect(PAIRING_LOCKOUT_MS).toBeLessThanOrEqual(60 * 60 * 1000);
    });

    it("still accepts a valid code just before the limit", async () => {
        await failAttempts(MAX_FAILED_PAIRING_ATTEMPTS - 1);
        const { code } = await createPairingCode();

        await expect(submit({ code, name: "Pixel 8" })).rejects.toThrow("NEXT_REDIRECT");
    });

    it("refuses even a valid code once the limit is reached, without using it up", async () => {
        await failAttempts(MAX_FAILED_PAIRING_ATTEMPTS);
        const { code } = await createPairingCode();

        const state = await submit({ code, name: "Pixel 8" });

        expect(state.error).toBeTruthy();
        expect(setCookie).not.toHaveBeenCalled();
        expect(await redeemPairingCode(code, "Pixel 8")).not.toBeNull();
    });

    it("accepts codes again after the lockout passes", async () => {
        await failAttempts(MAX_FAILED_PAIRING_ATTEMPTS);
        vi.advanceTimersByTime(PAIRING_LOCKOUT_MS + 1000);
        const { code } = await createPairingCode();

        await expect(submit({ code, name: "Pixel 8" })).rejects.toThrow("NEXT_REDIRECT");
    });

    it("does not count invalid names as failed attempts", async () => {
        const { code } = await createPairingCode();
        for (let i = 0; i < MAX_FAILED_PAIRING_ATTEMPTS; i++) {
            await submit({ code, name: "" });
        }

        await expect(submit({ code, name: "Pixel 8" })).rejects.toThrow("NEXT_REDIRECT");
    });
});
