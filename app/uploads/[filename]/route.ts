import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { filename } = await params;
    const filePath = path.join(process.cwd(), "public", "uploads", filename);

    try {
        const file = await readFile(filePath);
        const ext = path.extname(filename).slice(1).toLowerCase();
        const contentType =
            ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
            ext === "png" ? "image/png" :
            ext === "webp" ? "image/webp" :
            ext === "gif" ? "image/gif" :
            "application/octet-stream";

        return new NextResponse(file, {
            headers: { "Content-Type": contentType },
        });
    } catch {
        return new NextResponse("Not found", { status: 404 });
    }
}
