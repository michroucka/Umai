"use server"

import {db} from "@/db";
import {asc, eq} from "drizzle-orm";
import {ingredients as i, steps as s} from "@/db/schema";

export async function getRecipeDetails(recipeId: number) {
    const [ingredients, steps] = await Promise.all([
        db.query.ingredients.findMany({
            where: eq(i.recipeId, recipeId),
            orderBy: asc(i.id),
        }),
        db.query.steps.findMany({
            where: eq(s.recipeId, recipeId),
            orderBy: asc(s.stepOrder),
        })
    ]);

    return { ingredients, steps };
}