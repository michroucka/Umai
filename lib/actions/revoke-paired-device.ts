"use server";

import { requireAdmin } from "@/lib/auth/session";
import { findDeviceById, revokeDevice } from "@/lib/auth/devices";
import { revalidatePath } from "next/cache";

export type RevokePairedDeviceResult = { error?: string };

export async function revokePairedDevice(deviceId: number): Promise<RevokePairedDeviceResult> {
    const currentDevice = await requireAdmin();
    if (currentDevice.id === deviceId) {
        return { error: "Nelze zrušit vlastní zařízení." };
    }

    const device = await findDeviceById(deviceId);
    if (!device) {
        return { error: "Zařízení nebylo nalezeno." };
    }

    await revokeDevice(deviceId);

    revalidatePath("/settings/devices");
    return {};
}
