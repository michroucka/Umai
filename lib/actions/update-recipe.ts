"use server"

import {saveImage} from "@/lib/actions/recipe-utils";
import {db} from "@/db";
import {ingredients, recipes, steps} from "@/db/schema";
import {RecipeFormValues} from "@/components/recipe-form";
import {eq} from "drizzle-orm";
import {redirect} from "next/navigation";
import {parsePrepTime} from "@/lib/utils";

export async function updateRecipe(recipeId: number, data: FormData)  {
    const ing = (JSON.parse(data.get("ingredients") as string) as
        RecipeFormValues["ingredients"]).filter(i => i.name.trim() !== "");
    const stp = (JSON.parse(data.get("steps") as string) as
        RecipeFormValues["steps"]).filter(s => s.content.trim() !== "");
    const prepTime = parsePrepTime(Number(data.get("hours")), Number(data.get("minutes")));
    const imgPath = await saveImage(data.get("image"));

    db.transaction((tx) => {
        tx.update(recipes).set({
            name: data.get("name") as string,
            description: data.get("description") as string || null,
            prepTime: prepTime,
            image: imgPath,
            portions: Number(data.get("portions")),
        }).where(eq(recipes.id, recipeId)).run();

        tx.delete(ingredients).where(eq(ingredients.recipeId, recipeId)).run();
        tx.delete(steps).where(eq(steps.recipeId, recipeId)).run();

        tx.insert(ingredients).values(
            ing.map((i) => ({
                recipeId: recipeId,
                name: i.name as string,
                note: i.note as string || null,
                amount: i.amount as number || null,
                unit: i.unit as string,
            }))
        ).run();

        tx.insert(steps).values(
            stp.map((s, idx) => ({
                recipeId: recipeId,
                stepOrder: idx,
                content: s.content,
            }))
        ).run();
    });

    redirect("/");
}