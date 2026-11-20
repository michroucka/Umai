import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { devices, pairingCodes } from "@/db/schema";
import {
    PAIRING_CODE_TTL_MS,
    createPairingCode,
    findDeviceByToken,
    listDevices,
    redeemPairingCode,
    revokeDevice,
} from "@/lib/auth/devices";

const MINUTE = 60 * 1000;

beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
    await db.delete(devices);
    await db.delete(pairingCodes);
});

afterEach(() => {
    vi.useRealTimers();
});

async function pairNewDevice(name = "Pixel 8", options: { isAdmin?: boolean } = {}) {
    const { code } = await createPairingCode(options);
    const paired = await redeemPairingCode(code, name);
    if (!paired) throw new Error("pairing failed");
    return paired;
}

describe("createPairingCode", () => {
    it("creates a readable code in the XXXX-XXXX format", async () => {
        const { code } = await createPairingCode();
        expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    });

    it("leaves out characters that are easy to confuse", async () => {
        const codes = await Promise.all(Array.from({ length: 50 }, () => createPairingCode()));
        for (const { code } of codes) {
            expect(code).not.toMatch(/[01IO]/);
        }
    });

    it("creates a different code every time", async () => {
        const codes = await Promise.all(Array.from({ length: 50 }, () => createPairingCode()));
        expect(new Set(codes.map(({ code }) => code)).size).toBe(50);
    });

    it("expires after PAIRING_CODE_TTL_MS", async () => {
        const { expiresAt } = await createPairingCode();
        expect(expiresAt.getTime()).toBe(Date.now() + PAIRING_CODE_TTL_MS);
    });

    it("is valid for at least a few minutes and at most an hour", () => {
        expect(PAIRING_CODE_TTL_MS).toBeGreaterThanOrEqual(5 * MINUTE);
        expect(PAIRING_CODE_TTL_MS).toBeLessThanOrEqual(60 * MINUTE);
    });

    it("stores only a hash of the code, never the code itself", async () => {
        const { code } = await createPairingCode();
        const stored = JSON.stringify(await db.select().from(pairingCodes));
        expect(stored).not.toContain(code);
        expect(stored).not.toContain(code.replace("-", ""));
    });
});

describe("redeemPairingCode", () => {
    it("creates a device with the given name and returns its token", async () => {
        const { code } = await createPairingCode();
        const paired = await redeemPairingCode(code, "Pixel 8");

        expect(paired).not.toBeNull();
        expect(paired!.device.name).toBe("Pixel 8");
        expect(paired!.device.isAdmin).toBe(false);
        expect(paired!.token.length).toBeGreaterThanOrEqual(32);
    });

    it("pairs an admin device from an admin code", async () => {
        const { device } = await pairNewDevice("Můj telefon", { isAdmin: true });
        expect(device.isAdmin).toBe(true);
    });

    it("trims the device name", async () => {
        const { device } = await pairNewDevice("  iPhone mámy  ");
        expect(device.name).toBe("iPhone mámy");
    });

    it("accepts the code in lowercase, without the dash and with spaces around", async () => {
        const { code } = await createPairingCode();
        const typed = ` ${code.replace("-", "").toLowerCase()} `;
        expect(await redeemPairingCode(typed, "Pixel 8")).not.toBeNull();
    });

    it("works only once", async () => {
        const { code } = await createPairingCode();
        expect(await redeemPairingCode(code, "První")).not.toBeNull();
        expect(await redeemPairingCode(code, "Druhý")).toBeNull();
        expect(await listDevices()).toHaveLength(1);
    });

    it("rejects an unknown code", async () => {
        await createPairingCode();
        expect(await redeemPairingCode("ABCD-EFGH", "Pixel 8")).toBeNull();
        expect(await listDevices()).toHaveLength(0);
    });

    it("rejects an empty code", async () => {
        expect(await redeemPairingCode("", "Pixel 8")).toBeNull();
    });

    it("still accepts a code just before it expires", async () => {
        const { code } = await createPairingCode();
        vi.advanceTimersByTime(PAIRING_CODE_TTL_MS - 1000);
        expect(await redeemPairingCode(code, "Pixel 8")).not.toBeNull();
    });

    it("rejects an expired code", async () => {
        const { code } = await createPairingCode();
        vi.advanceTimersByTime(PAIRING_CODE_TTL_MS + 1000);
        expect(await redeemPairingCode(code, "Pixel 8")).toBeNull();
        expect(await listDevices()).toHaveLength(0);
    });

    it("gives every device a different token", async () => {
        const first = await pairNewDevice("První");
        const second = await pairNewDevice("Druhý");
        expect(first.token).not.toBe(second.token);
    });

    it("stores only a hash of the device token, never the token itself", async () => {
        const { token } = await pairNewDevice();
        const stored = JSON.stringify(await db.select().from(devices));
        expect(stored).not.toContain(token);
    });
});

describe("findDeviceByToken", () => {
    it("finds the paired device by its token", async () => {
        const { token, device } = await pairNewDevice();
        const found = await findDeviceByToken(token);
        expect(found?.id).toBe(device.id);
        expect(found?.name).toBe("Pixel 8");
    });

    it("returns null for an unknown token", async () => {
        await pairNewDevice();
        expect(await findDeviceByToken("neplatny-token")).toBeNull();
    });

    it("returns null for an empty token", async () => {
        await pairNewDevice();
        expect(await findDeviceByToken("")).toBeNull();
    });

    it("does not accept the pairing code in place of the token", async () => {
        const { code } = await createPairingCode();
        await redeemPairingCode(code, "Pixel 8");
        expect(await findDeviceByToken(code)).toBeNull();
    });

    it("records when the device was last seen", async () => {
        const { token } = await pairNewDevice();
        vi.advanceTimersByTime(3 * 24 * 60 * MINUTE);

        const found = await findDeviceByToken(token);
        expect(found?.lastSeenAt.getTime()).toBe(Date.now());
    });

    it("returns null for a revoked device", async () => {
        const { token, device } = await pairNewDevice();
        await revokeDevice(device.id);
        expect(await findDeviceByToken(token)).toBeNull();
    });
});

describe("listDevices", () => {
    it("lists paired devices with the most recently seen first", async () => {
        const old = await pairNewDevice("Starý tablet");
        vi.advanceTimersByTime(MINUTE);
        await pairNewDevice("Pixel 8");
        vi.advanceTimersByTime(MINUTE);
        await findDeviceByToken(old.token);

        const names = (await listDevices()).map((device) => device.name);
        expect(names).toEqual(["Starý tablet", "Pixel 8"]);
    });

    it("does not expose token hashes", async () => {
        await pairNewDevice();
        const [device] = await listDevices();
        expect(Object.keys(device)).not.toContain("tokenHash");
    });
});

describe("revokeDevice", () => {
    it("removes only the given device", async () => {
        const kept = await pairNewDevice("Pixel 8");
        const revoked = await pairNewDevice("Ztracený telefon");

        await revokeDevice(revoked.device.id);

        expect((await listDevices()).map((device) => device.id)).toEqual([kept.device.id]);
        expect(await findDeviceByToken(kept.token)).not.toBeNull();
    });
});
