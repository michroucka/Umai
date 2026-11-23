import { describe, expect, it } from "vitest";
import { MAX_DEVICE_NAME_LENGTH, suggestDeviceName } from "@/lib/auth/device-name";

const userAgents = {
    iPhoneSafari:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    iPhoneChrome:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
    iPhoneFirefox:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15",
    iPadSafari:
        "Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
    androidChrome:
        "Mozilla/5.0 (Linux; Android 15; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    androidFirefox: "Mozilla/5.0 (Android 15; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0",
    macSafari:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    macChrome:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    windowsEdge:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    windowsFirefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    linuxChrome:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

describe("suggestDeviceName", () => {
    it.each([
        ["iPhoneSafari", "iPhone · Safari"],
        ["iPhoneChrome", "iPhone · Chrome"],
        ["iPhoneFirefox", "iPhone · Firefox"],
        ["iPadSafari", "iPad · Safari"],
        ["androidChrome", "Android · Chrome"],
        ["androidFirefox", "Android · Firefox"],
        ["macSafari", "Mac · Safari"],
        ["macChrome", "Mac · Chrome"],
        ["windowsEdge", "Windows · Edge"],
        ["windowsFirefox", "Windows · Firefox"],
        ["linuxChrome", "Linux · Chrome"],
    ] as const)("names %s as %s", (key, expected) => {
        expect(suggestDeviceName(userAgents[key])).toBe(expected);
    });

    it("names only the system when the browser is unknown", () => {
        expect(suggestDeviceName("Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) SomeApp/2.0")).toBe("iPhone");
    });

    it("names only the browser when the system is unknown", () => {
        expect(suggestDeviceName("Mozilla/5.0 (Unknown OS) Gecko/20100101 Firefox/132.0")).toBe("Firefox");
    });

    it("returns an empty name when it recognizes nothing, so the user fills it in", () => {
        expect(suggestDeviceName("curl/8.5.0")).toBe("");
        expect(suggestDeviceName("")).toBe("");
        expect(suggestDeviceName(null)).toBe("");
    });

    it("always fits into the stored device name", () => {
        for (const userAgent of Object.values(userAgents)) {
            expect(suggestDeviceName(userAgent).length).toBeLessThanOrEqual(MAX_DEVICE_NAME_LENGTH);
        }
    });
});
