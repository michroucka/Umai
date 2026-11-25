import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { devices, pairingCodes, recipes } from "@/db/schema";
import { createRecipe } from "@/lib/actions/create-recipe";
import { getRecipeDetails } from "@/lib/actions/get-recipe-details";
import { createPairingCode, redeemPairingCode } from "@/lib/auth/devices";
import { DEVICE_COOKIE_NAME } from "@/lib/auth/session";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT ${url}`);
    }),
}));

type IngredientRow = { name: string; note?: string; amount?: number; unit: string };
type StepRow = { content: string };

// Mirrors what components/recipe-form.tsx sends: the ingredient list always ends with an empty row.
function recipeFormData(fields: {
    name: string;
    description?: string;
    portions?: number;
    hours?: number;
    minutes?: number;
    image?: string;
    ingredients: IngredientRow[];
    steps: StepRow[];
}) {
    const formData = new FormData();
    formData.append("name", fields.name);
    if (fields.description) formData.append("description", fields.description);
    formData.append("portions", String(fields.portions ?? 4));
    formData.append("hours", String(fields.hours ?? 0));
    formData.append("minutes", String(fields.minutes ?? 0));
    if (fields.image) formData.append("image", fields.image);
    formData.append("ingredients", JSON.stringify([...fields.ingredients, { name: "", unit: "" }]));
    formData.append("steps", JSON.stringify(fields.steps));
    return formData;
}

async function submitNewRecipe(formData: FormData) {
    await expect(createRecipe(formData)).rejects.toThrow("NEXT_REDIRECT /");
}

async function onlySavedRecipe() {
    const saved = await db.query.recipes.findMany();
    expect(saved).toHaveLength(1);
    return { ...saved[0], ...(await getRecipeDetails(saved[0].id)) };
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
    vi.mocked(redirect).mockClear();
});

describe("createRecipe", () => {
    it("saves the recipe with its ingredients and steps in order, then goes back to the list", async () => {
        await submitNewRecipe(
            recipeFormData({
                name: "Smažený rýže",
                description: "Z rýže od včera",
                portions: 2,
                hours: 1,
                minutes: 15,
                ingredients: [
                    { name: "Rýže", amount: 300, unit: "g" },
                    { name: "Vejce", amount: 2, unit: "ks", note: "rozšlehaná" },
                    { name: "Sójová omáčka", amount: 1.5, unit: "lžíce" },
                ],
                steps: [{ content: "Rozpal wok." }, { content: "Osmahni rýži." }, { content: "Přidej vejce." }],
            }),
        );

        const recipe = await onlySavedRecipe();
        expect(recipe).toMatchObject({
            name: "Smažený rýže",
            description: "Z rýže od včera",
            portions: 2,
            prepTime: 75,
            image: null,
        });
        expect(recipe.ingredients.map(({ name, amount, unit, note }) => ({ name, amount, unit, note }))).toEqual([
            { name: "Rýže", amount: 300, unit: "g", note: null },
            { name: "Vejce", amount: 2, unit: "ks", note: "rozšlehaná" },
            { name: "Sójová omáčka", amount: 1.5, unit: "lžíce", note: null },
        ]);
        expect(recipe.steps.map(({ stepOrder, content }) => ({ stepOrder, content }))).toEqual([
            { stepOrder: 0, content: "Rozpal wok." },
            { stepOrder: 1, content: "Osmahni rýži." },
            { stepOrder: 2, content: "Přidej vejce." },
        ]);
        expect(redirect).toHaveBeenCalledWith("/");
    });

    it("skips blank ingredient rows and blank steps", async () => {
        await submitNewRecipe(
            recipeFormData({
                name: "Čaj",
                ingredients: [
                    { name: "Voda", amount: 250, unit: "ml" },
                    { name: "   ", unit: "" },
                    { name: "Čaj", amount: 1, unit: "sáček" },
                ],
                steps: [{ content: "Svař vodu." }, { content: "  " }, { content: "Zalij čaj." }],
            }),
        );

        const recipe = await onlySavedRecipe();
        expect(recipe.ingredients.map((ingredient) => ingredient.name)).toEqual(["Voda", "Čaj"]);
        expect(recipe.steps.map(({ stepOrder, content }) => ({ stepOrder, content }))).toEqual([
            { stepOrder: 0, content: "Svař vodu." },
            { stepOrder: 1, content: "Zalij čaj." },
        ]);
    });

    it("stores missing optional values as null", async () => {
        await submitNewRecipe(
            recipeFormData({
                name: "Toast",
                ingredients: [{ name: "Sůl", unit: "špetka" }],
                steps: [{ content: "Opeč chleba." }],
            }),
        );

        const recipe = await onlySavedRecipe();
        expect(recipe).toMatchObject({ description: null, prepTime: null, image: null });
        expect(recipe.ingredients[0]).toMatchObject({ amount: null, note: null });
        expect(recipe.date).toEqual(expect.any(String));
    });

    it("keeps an image URL as it is (the import sends a URL instead of a file)", async () => {
        await submitNewRecipe(
            recipeFormData({
                name: "Ramen",
                image: "https://example.com/ramen.jpg",
                ingredients: [{ name: "Nudle", amount: 200, unit: "g" }],
                steps: [{ content: "Uvař nudle." }],
            }),
        );

        expect((await onlySavedRecipe()).image).toBe("https://example.com/ramen.jpg");
    });

    // The form refuses this, but a server action is a public endpoint and the form is not the only caller.
    it("saves nothing when the recipe has no steps", async () => {
        const submitted = createRecipe(
            recipeFormData({
                name: "Bez postupu",
                ingredients: [{ name: "Mouka", amount: 500, unit: "g" }],
                steps: [{ content: " " }],
            }),
        );

        await expect(submitted).rejects.toThrow();
        expect(redirect).not.toHaveBeenCalled();
        expect(await db.query.recipes.findMany()).toEqual([]);
        expect(await db.query.ingredients.findMany()).toEqual([]);
    });

    it("saves nothing when the recipe has no ingredients", async () => {
        const submitted = createRecipe(
            recipeFormData({
                name: "Bez ingrediencí",
                ingredients: [],
                steps: [{ content: "Nic nedělej." }],
            }),
        );

        await expect(submitted).rejects.toThrow();
        expect(redirect).not.toHaveBeenCalled();
        expect(await db.query.recipes.findMany()).toEqual([]);
        expect(await db.query.steps.findMany()).toEqual([]);
    });
});
