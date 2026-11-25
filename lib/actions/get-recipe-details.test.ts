import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { db } from "@/db";
import { devices, ingredients, pairingCodes, recipes, steps } from "@/db/schema";
import { getRecipeDetails } from "@/lib/actions/get-recipe-details";
import { createPairingCode, redeemPairingCode } from "@/lib/auth/devices";
import { DEVICE_COOKIE_NAME } from "@/lib/auth/session";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT ${url}`);
    }),
}));

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
});

describe("getRecipeDetails", () => {
    it("returns the recipe's ingredients in the order they were added and its steps in step order", async () => {
        const [recipe] = await db.insert(recipes).values({ name: "Guláš", portions: 4 }).returning();
        const [other] = await db.insert(recipes).values({ name: "Knedlíky", portions: 4 }).returning();
        await db.insert(ingredients).values([
            { recipeId: recipe.id, name: "Hovězí", amount: 1, unit: "kg" },
            { recipeId: other.id, name: "Mouka", amount: 500, unit: "g" },
            { recipeId: recipe.id, name: "Cibule", amount: 3, unit: "ks" },
            { recipeId: recipe.id, name: "Paprika", amount: 2, unit: "lžíce" },
        ]);
        await db.insert(steps).values([
            { recipeId: recipe.id, stepOrder: 2, content: "Duš dvě hodiny." },
            { recipeId: other.id, stepOrder: 0, content: "Uhněť těsto." },
            { recipeId: recipe.id, stepOrder: 0, content: "Osmahni cibuli." },
            { recipeId: recipe.id, stepOrder: 1, content: "Přidej maso." },
        ]);

        const details = await getRecipeDetails(recipe.id);

        expect(details.ingredients.map((ingredient) => ingredient.name)).toEqual(["Hovězí", "Cibule", "Paprika"]);
        expect(details.steps.map((step) => step.content)).toEqual([
            "Osmahni cibuli.",
            "Přidej maso.",
            "Duš dvě hodiny.",
        ]);
    });

    it("returns empty lists for a recipe that does not exist", async () => {
        expect(await getRecipeDetails(999)).toEqual({ ingredients: [], steps: [] });
    });
});
