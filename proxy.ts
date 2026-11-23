import { type NextRequest, NextResponse } from "next/server";
import { DEVICE_COOKIE_NAME, deviceCookieOptions } from "@/lib/auth/session";

export function proxy(request: NextRequest): NextResponse {
    const cookie = request.cookies.get(DEVICE_COOKIE_NAME);
    if (cookie) {
        const response = NextResponse.next();
        response.cookies.set(DEVICE_COOKIE_NAME, cookie.value, deviceCookieOptions);
        return response;
    } else if (request.nextUrl.pathname === "/pair") {
        return NextResponse.next();
    } else if (request.method !== "GET" && request.method !== "HEAD") {
        return new NextResponse(null, { status: 401 });
    }

    const pairUrl = new URL("/pair", request.url);
    if (request.nextUrl.pathname !== "/") {
        pairUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    }

    return NextResponse.redirect(pairUrl);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon\\.png|icon-192\\.png|icon-512\\.png|maskable-512\\.png|manifest\\.webmanifest|brand/).*)",
    ],
};
