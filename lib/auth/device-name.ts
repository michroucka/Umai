// Shared with the client pairing form, so this module must not import the database.
export const MAX_DEVICE_NAME_LENGTH = 50;

// Order matters: iPhone UAs mention "Mac OS X", Android UAs mention "Linux",
// Edge UAs mention "Chrome" and Chrome UAs mention "Safari".
const SYSTEMS: [RegExp, string][] = [
    [/iPhone/, "iPhone"],
    [/iPad/, "iPad"],
    [/Android/, "Android"],
    [/Macintosh/, "Mac"],
    [/Windows/, "Windows"],
    [/Linux/, "Linux"],
];

const BROWSERS: [RegExp, string][] = [
    [/Edg(A|iOS)?\//, "Edge"],
    [/CriOS\/|Chrome\//, "Chrome"],
    [/FxiOS\/|Firefox\//, "Firefox"],
    [/Version\/.*Safari\//, "Safari"],
];

function firstMatch(userAgent: string, candidates: [RegExp, string][]) {
    return candidates.find(([pattern]) => pattern.test(userAgent))?.[1];
}

export function suggestDeviceName(userAgent: string | null): string {
    if (!userAgent) {
        return "";
    }

    return [firstMatch(userAgent, SYSTEMS), firstMatch(userAgent, BROWSERS)].filter(Boolean).join(" · ");
}
