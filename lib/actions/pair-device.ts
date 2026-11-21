"use server";

import { redirect } from "next/navigation";
import { MAX_DEVICE_NAME_LENGTH, redeemPairingCode } from "@/lib/auth/devices";
import { PAIRING_LOCKOUT_MS, isPairingLocked, recordFailedPairing } from "@/lib/auth/pairing-limit";
import { setDeviceCookie } from "@/lib/auth/session";

export type PairDeviceState = { error?: string };

export async function pairDevice(_previousState: PairDeviceState, formData: FormData): Promise<PairDeviceState> {
    const code = String(formData.get("code") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const next = safeNextPath(String(formData.get("next") ?? ""));

    if (!name || name.length > MAX_DEVICE_NAME_LENGTH) {
        return { error: `Zadej název zařízení (nejvýš ${MAX_DEVICE_NAME_LENGTH} znaků).` };
    }

    if (isPairingLocked()) {
        return { error: `Příliš mnoho chybných pokusů. Zkus to znovu za ${PAIRING_LOCKOUT_MS / 60_000} minut.` };
    }

    const result = await redeemPairingCode(code, name);

    if (!result) {
        recordFailedPairing();
        return { error: "Kód je neplatný nebo už vypršel." };
    }

    await setDeviceCookie(result.token);

    redirect(next);
}

function safeNextPath(path: string) {
    if (path.startsWith("/") && !(path.startsWith("//") || path.startsWith("/\\"))) {
        return path;
    }

    return "/";
}
