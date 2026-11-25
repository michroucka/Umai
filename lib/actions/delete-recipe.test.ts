import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { devices, ingredients, pairingCodes, recipes, steps } from "@/db/schema";
import { deleteRecipe } from "@/lib/actions/delete-recipe";
import { createPairingCode, redeemPairingCode } from "@/lib/auth/devices";
import { DEVICE_COOKIE_NAME } from "@/lib/auth/session";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT ${url}`);
    }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

async function insertRecipe(name: string) {
    const [recipe] = await db.insert(recipes).values({ name, portions: 2 }).returning();
    await db.insert(ingredients).values({ recipeId: recipe.id, name: "Vejce", amount: 2, unit: "ks" });
    await db.insert(steps).values({ recipeId: recipe.id, stepOrder: 0, content: "Uvař vejce." });
    return recipe;
}

beforeEach(async () => {
    await db.delete(recipes);
    await db.delete(devices);
    await db.delete(pairingCodes);

    const { code } = await createPairingCode();
    const paired = await redeemPairingCode(code, "Kuchyně");
    if (!paired) throw new Error("pairing failed");
    vi.mocked(cookies).mockResolvedValue({
        get: (name: string) => (name === DEVICE_COOKIE_NAME ? { name, value: paired.token } : undefined),
        set: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(revalidatePath).mockClear();
});

describe("deleteRecipe", () => {
    it("deletes the recipe with its ingredients and steps and refreshes the list", async () => {
        const recipe = await insertRecipe("Vajíčka natvrdo");

        await deleteRecipe(recipe.id);

        expect(await db.query.recipes.findMany()).toEqual([]);
        expect(await db.query.ingredients.findMany()).toEqual([]);
        expect(await db.query.steps.findMany()).toEqual([]);
        expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("leaves other recipes untouched", async () => {
        const deleted = await insertRecipe("Vajíčka natvrdo");
        const kept = await insertRecipe("Míchaná vejce");

        await deleteRecipe(deleted.id);

        expect((await db.query.recipes.findMany()).map((recipe) => recipe.id)).toEqual([kept.id]);
        expect((await db.query.ingredients.findMany()).map((ingredient) => ingredient.recipeId)).toEqual([kept.id]);
        expect((await db.query.steps.findMany()).map((step) => step.recipeId)).toEqual([kept.id]);
    });
});
