"use server"

import path from "path";
import {mkdir, writeFile} from "fs/promises";


export async function saveImage(img: FormDataEntryValue | null): Promise<string | null> {
    if (img instanceof File) {
        const arrayBuffer = await img.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const ext = img.name.split(".").pop();
        const filename = `${crypto.randomUUID()}.${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buffer);

        return `/uploads/${filename}`;
    }
    return img as string || null;
}