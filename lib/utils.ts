import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

type Segment =
    | { type: "text"; value: string; }
    | { type: "amount"; value: number; unit: string; }

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
    if (amount >= 10) return Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(amount);
    if (amount >= 1) return Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 }).format(amount);
    return Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 2 }).format(amount);
}

export function parseScalable(text: string): Segment[] {
    return text
        .split(/\{([^}]+)\}/)
        .map((token, i): Segment => {
            if (i % 2 === 0) {
                return { type: "text", value: token };
            }

            const match = token.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
            if (!match) {
                return { type: "text", value: `{${token}}` };
            }

            return {
                type: "amount",
                value: Number(match[1].replace(",", ".")),
                unit: match[2],
            };
        })
        .filter((segment) => segment.type !== "text" || segment.value !== "");
}
