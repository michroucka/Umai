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
