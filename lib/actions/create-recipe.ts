"use server"

import { db } from "@/db";
import {ingredients, recipes, steps} from "@/db/schema";
import {redirect} from "next/navigation";
import {saveImage} from "@/lib/actions/recipe-utils";
import {RecipeFormValues} from "@/components/recipe-form";
import {parsePrepTime} from "@/lib/utils";

export async function createRecipe(data: FormData) {
    const ing = (JSON.parse(data.get("ingredients") as string) as
        RecipeFormValues["ingredients"]).filter(i => i.name.trim() !== "");
    const stp = (JSON.parse(data.get("steps") as string) as
        RecipeFormValues["steps"]).filter(s => s.content.trim() !== "");

    const prepTime = parsePrepTime(Number(data.get("hours")), Number(data.get("minutes")));
    const date = new Date().toISOString();
    const imgPath = await saveImage(data.get("image"));


    const [recipe] = await db.insert(recipes).values({
        name: data.get("name") as string,
        description: data.get("description") as string || null,
        date: date,
        prepTime: prepTime,
        image: imgPath,
        portions: Number(data.get("portions")),
    }).returning();

    await db.insert(ingredients).values(
        ing.map((i) => ({
            recipeId: recipe.id,
            name: i.name as string,
            note: i.note as string || null,
            amount: i.amount as number || null,
            unit: i.unit as string,
        }))
    );

    await db.insert(steps).values(
        stp.map((s, idx) => ({
            recipeId: recipe.id,
            stepOrder: idx,
            content: s.content,
        }))
    );

    redirect("/");
}