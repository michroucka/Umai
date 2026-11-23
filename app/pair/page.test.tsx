// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import PairPage from "@/app/pair/page";
import { getCurrentDevice } from "@/lib/auth/session";
import type { Device } from "@/lib/auth/devices";

vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT ${url}`);
    }),
}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentDevice: vi.fn() }));
vi.mock("@/lib/actions/pair-device", () => ({ pairDevice: vi.fn() }));

// jsdom has no layout; input-otp calls elementFromPoint to detect password manager badges.
document.elementFromPoint = () => null;

const pairedDevice: Device = {
    id: 1,
    name: "Pixel 8",
    isAdmin: false,
    createdAt: new Date(),
    lastSeenAt: new Date(),
};

async function renderPage(searchParams: Record<string, string | string[] | undefined> = {}) {
    render(await PairPage({ searchParams: Promise.resolve(searchParams) }));
}

const iPhoneUserAgent =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

function setUserAgent(userAgent: string | null) {
    const requestHeaders = new Headers(userAgent === null ? {} : { "user-agent": userAgent });
    vi.mocked(headers).mockResolvedValue(requestHeaders as Awaited<ReturnType<typeof headers>>);
}

beforeEach(() => {
    setUserAgent(iPhoneUserAgent);
    vi.mocked(getCurrentDevice).mockResolvedValue(null);
    vi.mocked(redirect).mockClear();
});

afterEach(cleanup);

describe("PairPage for an already paired device", () => {
    beforeEach(() => {
        vi.mocked(getCurrentDevice).mockResolvedValue(pairedDevice);
    });

    it("skips pairing and continues to `next`", async () => {
        await expect(renderPage({ next: "/recipes/12" })).rejects.toThrow("NEXT_REDIRECT /recipes/12");
    });

    it("goes to the recipes without `next`", async () => {
        await expect(renderPage()).rejects.toThrow(/^NEXT_REDIRECT \/$/);
    });

    it("goes to the recipes for an unsafe `next`", async () => {
        await expect(renderPage({ next: "//evil.example" })).rejects.toThrow(/^NEXT_REDIRECT \/$/);
    });
});

describe("PairPage for a new device", () => {
    function nextField() {
        return document.querySelector<HTMLInputElement>('input[type="hidden"][name="next"]');
    }

    it("shows the pairing form", async () => {
        await renderPage();
        expect(screen.getByRole("button", { name: /spárovat/i })).toBeTruthy();
        expect(redirect).not.toHaveBeenCalled();
    });

    it("passes `next` to the form, so pairing continues where the user was going", async () => {
        await renderPage({ next: "/recipes/new?url=https%3A%2F%2Fwww.tiktok.com%2F%40kuchar%2Fvideo%2F1" });
        expect(nextField()?.value).toBe("/recipes/new?url=https%3A%2F%2Fwww.tiktok.com%2F%40kuchar%2Fvideo%2F1");
    });

    it("passes / to the form instead of an unsafe or missing `next`", async () => {
        await renderPage({ next: "https://evil.example" });
        expect(nextField()?.value).toBe("/");

        cleanup();
        await renderPage();
        expect(nextField()?.value).toBe("/");
    });

    it("uses the first `next` when the URL repeats it", async () => {
        await renderPage({ next: ["/recipes/3", "/recipes/4"] });
        expect(nextField()?.value).toBe("/recipes/3");
    });

    it("prefills the device name guessed from the browser", async () => {
        await renderPage();
        expect(screen.getByLabelText<HTMLInputElement>(/název zařízení/i).value).toBe("iPhone · Safari");
    });

    it("leaves the device name empty when the browser sends no User-Agent", async () => {
        setUserAgent(null);
        await renderPage();
        expect(screen.getByLabelText<HTMLInputElement>(/název zařízení/i).value).toBe("");
    });
});
