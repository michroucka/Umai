import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function parsePrepTime(hours: number, minutes: number): number | null {
    return (hours !== 0 || minutes !== 0) ? hours * 60 + minutes : null;
}

export function parseHoursMinutes(prepTime: number) {
    return { hours: Math.floor(prepTime / 60), minutes: prepTime % 60 }
}

export function formatAmount(amount: number): string {
    if (amount >= 10) return Math.round(amount).toString();
    if (amount >= 1) return (Math.round(amount * 10) / 10).toString();
    return (Math.round(amount * 100) / 100).toString();
}
