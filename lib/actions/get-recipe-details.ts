"use server";

import { db } from "@/db";
import { asc, eq } from "drizzle-orm";
import { ingredients as i, steps as s } from "@/db/schema";
import { requireDevice } from "@/lib/auth/session";

export async function getRecipeDetails(recipeId: number) {
    await requireDevice();
    const [ingredients, steps] = await Promise.all([
        db.query.ingredients.findMany({
            where: eq(i.recipeId, recipeId),
            orderBy: asc(i.id),
        }),
        db.query.steps.findMany({
            where: eq(s.recipeId, recipeId),
            orderBy: asc(s.stepOrder),
        }),
    ]);

    return { ingredients, steps };
}
