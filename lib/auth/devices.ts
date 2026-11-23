import { createHash, randomBytes, randomInt } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { devices, pairingCodes } from "@/db/schema";

export const PAIRING_CODE_TTL_MS = 15 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type Device = Omit<typeof devices.$inferSelect, "tokenHash">;
const deviceColumns = {
    id: devices.id,
    name: devices.name,
    isAdmin: devices.isAdmin,
    createdAt: devices.createdAt,
    lastSeenAt: devices.lastSeenAt,
};

export async function createPairingCode({ isAdmin = false }: { isAdmin?: boolean } = {}): Promise<{
    code: string;
    expiresAt: Date;
}> {
    const code = generateCode();
    const codeHash = hash(normalizeCode(code));
    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);

    await db.insert(pairingCodes).values({
        codeHash,
        isAdmin,
        expiresAt,
    });

    return { code, expiresAt };
}

export async function redeemPairingCode(
    code: string,
    deviceName: string,
): Promise<{ token: string; device: Device } | null> {
    const now = new Date();
    const codeHash = hash(normalizeCode(code));

    const [pairingCode] = await db
        .delete(pairingCodes)
        .where(and(eq(pairingCodes.codeHash, codeHash), gt(pairingCodes.expiresAt, now)))
        .returning();

    if (!pairingCode) {
        return null;
    }

    const token = randomBytes(32).toString("base64url");

    const [device] = await db
        .insert(devices)
        .values({
            name: deviceName.trim(),
            tokenHash: hash(token),
            isAdmin: pairingCode.isAdmin,
        })
        .returning(deviceColumns);

    return { token, device };
}

export async function findDeviceByToken(token: string): Promise<Device | null> {
    const tokenHash = hash(token);
    const now = new Date();

    const [device] = await db
        .update(devices)
        .set({ lastSeenAt: now })
        .where(eq(devices.tokenHash, tokenHash))
        .returning(deviceColumns);

    return device ?? null;
}

export async function findDeviceById(id: number): Promise<Device | null> {
    const [device] = await db.select(deviceColumns).from(devices).where(eq(devices.id, id)).limit(1);

    return device ?? null;
}

export async function listDevices(): Promise<Device[]> {
    return db.select(deviceColumns).from(devices).orderBy(desc(devices.lastSeenAt));
}

export async function revokeDevice(deviceId: number): Promise<void> {
    await db.delete(devices).where(eq(devices.id, deviceId));
}

function hash(value: string) {
    return createHash("sha256").update(value).digest("hex");
}

function normalizeCode(input: string) {
    return input.replace(/[\s-]/g, "").toUpperCase();
}

function generateCode() {
    const chars = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}
