import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { devices, pairingCodes } from "@/db/schema";
import { revokePairedDevice } from "@/lib/actions/revoke-paired-device";
import { createPairingCode, listDevices, redeemPairingCode } from "@/lib/auth/devices";
import { DEVICE_COOKIE_NAME } from "@/lib/auth/session";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT ${url}`);
    }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let cookieJar: Map<string, string>;

beforeEach(async () => {
    await db.delete(devices);
    await db.delete(pairingCodes);

    cookieJar = new Map();
    vi.mocked(cookies).mockResolvedValue({
        get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
        set: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(revalidatePath).mockClear();
});

async function pairNewDevice(name: string, options: { isAdmin?: boolean } = {}) {
    const { code } = await createPairingCode(options);
    const paired = await redeemPairingCode(code, name);
    if (!paired) throw new Error("pairing failed");
    return paired;
}

async function signInAs(name: string, options: { isAdmin?: boolean } = {}) {
    const paired = await pairNewDevice(name, options);
    cookieJar.set(DEVICE_COOKIE_NAME, paired.token);
    return paired.device;
}

async function remainingDeviceNames() {
    return (await listDevices()).map((device) => device.name).sort();
}

describe("revokePairedDevice by an admin", () => {
    it("revokes another device and refreshes the devices page", async () => {
        await signInAs("Admin", { isAdmin: true });
        const { device: phone } = await pairNewDevice("Mámin telefon");

        const result = await revokePairedDevice(phone.id);

        expect(result.error).toBeUndefined();
        expect(await remainingDeviceNames()).toEqual(["Admin"]);
        expect(revalidatePath).toHaveBeenCalledWith("/settings/devices");
    });

    it("revokes another admin device", async () => {
        await signInAs("Admin", { isAdmin: true });
        const { device: otherAdmin } = await pairNewDevice("Druhý admin", { isAdmin: true });

        const result = await revokePairedDevice(otherAdmin.id);

        expect(result.error).toBeUndefined();
        expect(await remainingDeviceNames()).toEqual(["Admin"]);
    });

    // Also covers "never revoke the last admin": the caller is an admin, so another admin can never be the last one.
    it("refuses to revoke the admin's own device", async () => {
        const admin = await signInAs("Admin", { isAdmin: true });
        await pairNewDevice("Mámin telefon");

        const result = await revokePairedDevice(admin.id);

        expect(result.error).toBeTruthy();
        expect(await remainingDeviceNames()).toEqual(["Admin", "Mámin telefon"]);
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("returns an error for a device that does not exist", async () => {
        await signInAs("Admin", { isAdmin: true });

        const result = await revokePairedDevice(999_999);

        expect(result.error).toBeTruthy();
        expect(await remainingDeviceNames()).toEqual(["Admin"]);
    });
});

describe("revokePairedDevice without admin rights", () => {
    it("sends a regular device back to the recipes and revokes nothing", async () => {
        await signInAs("Mámin telefon");
        const { device: otherPhone } = await pairNewDevice("Tátův telefon");

        await expect(revokePairedDevice(otherPhone.id)).rejects.toThrow(/^NEXT_REDIRECT \/$/);

        expect(await remainingDeviceNames()).toEqual(["Mámin telefon", "Tátův telefon"]);
    });

    it("redirects an unpaired browser to /pair and revokes nothing", async () => {
        const { device: phone } = await pairNewDevice("Mámin telefon");

        await expect(revokePairedDevice(phone.id)).rejects.toThrow("NEXT_REDIRECT /pair");

        expect(await remainingDeviceNames()).toEqual(["Mámin telefon"]);
    });
});
