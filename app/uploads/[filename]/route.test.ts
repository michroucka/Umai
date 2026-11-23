import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "fs/promises";
import { cookies } from "next/headers";
import { db } from "@/db";
import { devices, pairingCodes } from "@/db/schema";
import { createPairingCode, redeemPairingCode } from "@/lib/auth/devices";
import { DEVICE_COOKIE_NAME } from "@/lib/auth/session";
import { GET } from "@/app/uploads/[filename]/route";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT ${url}`);
    }),
}));
vi.mock("fs/promises", async (importOriginal) => ({
    ...(await importOriginal<typeof import("fs/promises")>()),
    readFile: vi.fn(),
}));

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const EXISTING_UPLOAD = "gulas.jpg";

let cookieJar: Map<string, string>;

beforeEach(async () => {
    await db.delete(devices);
    await db.delete(pairingCodes);

    cookieJar = new Map();
    vi.mocked(cookies).mockResolvedValue({
        get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
        set: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(readFile).mockReset();
    vi.mocked(readFile).mockImplementation(async (filePath) => {
        if (filePath === path.join(UPLOADS_DIR, EXISTING_UPLOAD)) return Buffer.from("jpeg-bytes");
        throw Object.assign(new Error(`ENOENT: ${filePath}`), { code: "ENOENT" });
    });
});

async function signIn() {
    const { code } = await createPairingCode();
    const paired = await redeemPairingCode(code, "Pixel 8");
    if (!paired) throw new Error("pairing failed");
    cookieJar.set(DEVICE_COOKIE_NAME, paired.token);
}

// Next decodes the segment before it reaches params, so "..%2F.env" in the URL arrives here as "../.env".
function getUpload(filename: string) {
    return GET(new Request(`https://umai.test/uploads/${encodeURIComponent(filename)}`), {
        params: Promise.resolve({ filename }),
    });
}

function readPaths() {
    return vi.mocked(readFile).mock.calls.map(([filePath]) => String(filePath));
}

describe("GET /uploads/[filename] for a paired device", () => {
    beforeEach(signIn);

    it("serves an uploaded image with its content type", async () => {
        const response = await getUpload(EXISTING_UPLOAD);

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/jpeg");
        expect(await response.text()).toBe("jpeg-bytes");
    });

    it("returns 404 for a missing file", async () => {
        const response = await getUpload("neexistuje.jpg");
        expect(response.status).toBe(404);
    });

    it.each(["../package.json", "../../.env", "../../umai.db", "obrazek/../../../.env", "..", "."])(
        "refuses to leave the uploads folder for %s",
        async (filename) => {
            const response = await getUpload(filename);

            expect([400, 404]).toContain(response.status);
            for (const filePath of readPaths()) {
                expect(filePath.startsWith(UPLOADS_DIR + path.sep)).toBe(true);
            }
        },
    );
});

describe("GET /uploads/[filename] without a paired device", () => {
    // Both are fine: a redirect to /pair (like pages) or a plain 401 (an <img> cannot follow a login page anyway).
    it("does not serve the file", async () => {
        const result = await getUpload(EXISTING_UPLOAD).catch((error: unknown) => error);

        if (result instanceof Response) {
            expect(result.status).toBe(401);
        } else {
            expect(String(result)).toContain("NEXT_REDIRECT /pair");
        }
        expect(readFile).not.toHaveBeenCalled();
    });
});
