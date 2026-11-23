import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type Device, findDeviceByToken } from "@/lib/auth/devices";

export const DEVICE_COOKIE_NAME = "umai_device";

export const deviceCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 400 * 24 * 60 * 60,
} as const;

export async function setDeviceCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(DEVICE_COOKIE_NAME, token, deviceCookieOptions);
}

export const getCurrentDevice = cache(async (): Promise<Device | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(DEVICE_COOKIE_NAME)?.value;

    return token ? findDeviceByToken(token) : null;
});

export async function requireDevice(): Promise<Device> {
    const device = await getCurrentDevice();
    if (!device) {
        redirect("/pair");
    }
    return device;
}

export async function requireAdmin(): Promise<Device> {
    const device = await requireDevice();
    if (!device.isAdmin) {
        redirect("/");
    }
    return device;
}
