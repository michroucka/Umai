"use server"

import {db} from "@/db";
import {recipes} from "@/db/schema";
import {eq} from "drizzle-orm";
import {revalidatePath} from "next/cache";


export async function deleteRecipe(recipeId: number) {
    await db.delete(recipes).where(eq(recipes.id, recipeId));
    revalidatePath("/");
}