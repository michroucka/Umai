"use server"

import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { db } from "@/db";
import {recipes} from "@/db/schema";
import {redirect} from "next/navigation";

export async function createRecipe(data: FormData) {
    const prepTime = Number(data.get("hours")) * 60 + Number(data.get("minutes"));
    const date = new Date().toISOString();

    let imgPath: string | null = null;
    const img = data.get("image");
    if (img instanceof File) {
        const arrayBuffer = await img.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const ext = img.name.split(".").pop();
        const filename = `${crypto.randomUUID()}.${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads");

        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buffer);

        imgPath = `/uploads/${filename}`;
    } else {
        imgPath = img as string || null;
    }

    await db.insert(recipes).values({
        name: data.get("name") as string,
        description: data.get("description") as string || null,
        date: date,
        prepTime: prepTime,
        image: imgPath,
        portions: Number(data.get("portions")),
    })

    redirect("/");
}