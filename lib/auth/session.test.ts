import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { devices, pairingCodes } from "@/db/schema";
import { createPairingCode, redeemPairingCode, revokeDevice } from "@/lib/auth/devices";
import {
    DEVICE_COOKIE_NAME,
    deviceCookieOptions,
    getCurrentDevice,
    requireAdmin,
    requireDevice,
    setDeviceCookie,
} from "@/lib/auth/session";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT ${url}`);
    }),
}));

const DAY_S = 24 * 60 * 60;

let cookieJar: Map<string, string>;
const setCookie = vi.fn();

beforeEach(async () => {
    await db.delete(devices);
    await db.delete(pairingCodes);

    cookieJar = new Map();
    setCookie.mockReset();
    vi.mocked(cookies).mockResolvedValue({
        get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
        set: setCookie,
    } as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(redirect).mockClear();
});

async function signIn(options: { isAdmin?: boolean } = {}) {
    const { code } = await createPairingCode(options);
    const paired = await redeemPairingCode(code, "Pixel 8");
    if (!paired) throw new Error("pairing failed");
    cookieJar.set(DEVICE_COOKIE_NAME, paired.token);
    return paired;
}

describe("deviceCookieOptions", () => {
    it("hides the cookie from JavaScript, sends it only over HTTPS and keeps it on this site", () => {
        expect(deviceCookieOptions).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    });

    it("lasts as long as browsers allow (400 days)", () => {
        expect(deviceCookieOptions.maxAge).toBe(400 * DAY_S);
    });
});

describe("setDeviceCookie", () => {
    it("stores the token in the device cookie with the shared options", async () => {
        await setDeviceCookie("token-123");
        expect(setCookie).toHaveBeenCalledWith(DEVICE_COOKIE_NAME, "token-123", deviceCookieOptions);
    });
});

describe("getCurrentDevice", () => {
    it("returns the device from the cookie", async () => {
        const { device } = await signIn();
        expect((await getCurrentDevice())?.id).toBe(device.id);
    });

    it("returns null without a cookie", async () => {
        await signIn();
        cookieJar.clear();
        expect(await getCurrentDevice()).toBeNull();
    });

    it("returns null for an invalid token", async () => {
        cookieJar.set(DEVICE_COOKIE_NAME, "neplatny-token");
        expect(await getCurrentDevice()).toBeNull();
    });

    it("returns null after the device was revoked", async () => {
        const { device } = await signIn();
        await revokeDevice(device.id);
        expect(await getCurrentDevice()).toBeNull();
    });

    it("does not set cookies, because Server Components cannot", async () => {
        await signIn();
        await getCurrentDevice();
        expect(setCookie).not.toHaveBeenCalled();
    });
});

describe("requireDevice", () => {
    it("returns the paired device", async () => {
        const { device } = await signIn();
        expect((await requireDevice()).id).toBe(device.id);
    });

    it("redirects to /pair without a valid device", async () => {
        await expect(requireDevice()).rejects.toThrow("NEXT_REDIRECT /pair");
        expect(redirect).toHaveBeenCalledWith("/pair");
    });
});

describe("requireAdmin", () => {
    it("returns an admin device", async () => {
        const { device } = await signIn({ isAdmin: true });
        expect((await requireAdmin()).id).toBe(device.id);
    });

    it("sends a regular device back to the recipes", async () => {
        await signIn();
        await expect(requireAdmin()).rejects.toThrow(/^NEXT_REDIRECT \/$/);
        expect(redirect).toHaveBeenCalledWith("/");
    });

    it("redirects to /pair without a valid device", async () => {
        await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT /pair");
    });
});
