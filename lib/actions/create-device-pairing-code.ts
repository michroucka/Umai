"use server";

import { requireAdmin } from "@/lib/auth/session";
import { createPairingCode } from "@/lib/auth/devices";

export type CreateDevicePairingCodeState = { code?: string; expiresAt?: Date; isAdmin?: boolean };

export async function createDevicePairingCode(
    previousState: CreateDevicePairingCodeState,
    formData: FormData,
): Promise<CreateDevicePairingCodeState> {
    await requireAdmin();
    const isAdmin = formData.get("isAdmin") === "on";
    const { code, expiresAt } = await createPairingCode({ isAdmin });

    return { code, expiresAt, isAdmin };
}
