import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";
import { DEVICE_COOKIE_NAME, deviceCookieOptions } from "@/lib/auth/session";

const ORIGIN = "https://umai.example";

function request(path: string, { method = "GET", token }: { method?: string; token?: string } = {}) {
    const headers = token ? { cookie: `${DEVICE_COOKIE_NAME}=${token}` } : undefined;
    return new NextRequest(`${ORIGIN}${path}`, { method, headers });
}

function redirectTarget(response: Response) {
    const location = getRedirectUrl(response as Parameters<typeof getRedirectUrl>[0]);
    return location === null ? null : new URL(location);
}

describe("proxy matcher", () => {
    it.each(["/", "/recipes/5", "/recipes/new?url=https%3A%2F%2Fwww.tiktok.com%2F", "/uploads/svickova.jpg", "/pair"])(
        "runs for %s",
        (url) => {
            expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
        },
    );

    it.each([
        "/_next/static/chunks/main.js",
        "/_next/image?url=%2Fbrand%2Fumai-horizontal.svg&w=384&q=75",
        "/favicon.ico",
        "/icon.svg",
        "/apple-icon.png",
        "/icon-192.png",
        "/icon-512.png",
        "/maskable-512.png",
        "/manifest.webmanifest",
        "/brand/umai-horizontal.svg",
    ])("skips %s, which the pairing page and app install need before pairing", (url) => {
        expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    });
});

describe("proxy without the device cookie", () => {
    it("sends a page visit to pairing and remembers where it was going", () => {
        const target = redirectTarget(proxy(request("/recipes/5")));

        expect(target?.pathname).toBe("/pair");
        expect(target?.searchParams.get("next")).toBe("/recipes/5");
    });

    it("keeps the query string, so a shared recipe link survives pairing", () => {
        const sharedRecipe = "/recipes/new?url=https%3A%2F%2Fwww.instagram.com%2Freel%2Fabc";
        const target = redirectTarget(proxy(request(sharedRecipe)));

        expect(target?.searchParams.get("next")).toBe(sharedRecipe);
    });

    it("sends the home page to pairing without a `next`", () => {
        const target = redirectTarget(proxy(request("/")));

        expect(target?.pathname).toBe("/pair");
        expect(target?.searchParams.has("next")).toBe(false);
    });

    it("uses a temporary redirect, so browsers do not cache it after pairing", () => {
        expect(proxy(request("/recipes/5")).status).toBe(307);
    });

    it("lets the pairing page through", () => {
        const response = proxy(request("/pair?next=%2Frecipes%2F5"));
        expect(redirectTarget(response)).toBeNull();
        expect(response.status).toBe(200);
    });

    it("lets the pairing form's server action through", () => {
        const response = proxy(request("/pair", { method: "POST" }));
        expect(redirectTarget(response)).toBeNull();
        expect(response.status).toBe(200);
    });

    it("answers other requests, e.g. server actions, with 401 instead of a redirect", () => {
        const response = proxy(request("/recipes/5", { method: "POST" }));
        expect(response.status).toBe(401);
        expect(redirectTarget(response)).toBeNull();
    });
});

describe("proxy with the device cookie", () => {
    it("lets the request through", () => {
        const response = proxy(request("/recipes/5", { token: "token-123" }));
        expect(redirectTarget(response)).toBeNull();
        expect(response.status).toBe(200);
    });

    it("does not check the token itself; pages and actions do that with the database", () => {
        const response = proxy(request("/recipes/5", { token: "revoked-or-made-up" }));
        expect(redirectTarget(response)).toBeNull();
    });

    it("renews the cookie on every visit, so a device in use never gets logged out", () => {
        const response = proxy(request("/recipes/5", { token: "token-123" }));
        const renewed = response.cookies.get(DEVICE_COOKIE_NAME);

        expect(renewed?.value).toBe("token-123");
        expect(renewed).toMatchObject({
            httpOnly: deviceCookieOptions.httpOnly,
            secure: deviceCookieOptions.secure,
            sameSite: deviceCookieOptions.sameSite,
            path: deviceCookieOptions.path,
            maxAge: deviceCookieOptions.maxAge,
        });
    });

    it("lets server actions through as well", () => {
        const response = proxy(request("/recipes/5", { method: "POST", token: "token-123" }));
        expect(response.status).toBe(200);
    });
});
