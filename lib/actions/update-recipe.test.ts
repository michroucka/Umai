import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { devices, ingredients, pairingCodes, recipes, steps } from "@/db/schema";
import { getRecipeDetails } from "@/lib/actions/get-recipe-details";
import { updateRecipe } from "@/lib/actions/update-recipe";
import { createPairingCode, redeemPairingCode } from "@/lib/auth/devices";
import { DEVICE_COOKIE_NAME } from "@/lib/auth/session";
import { parseHoursMinutes } from "@/lib/utils";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT ${url}`);
    }),
}));

type IngredientRow = { name: string; note?: string; amount?: number; unit: string };
type StepRow = { content: string };
type EditedRecipe = {
    name: string;
    description?: string;
    portions: number;
    hours: number;
    minutes: number;
    image?: string;
    ingredients: IngredientRow[];
    steps: StepRow[];
};

async function insertRecipe(name: string, fields: { image?: string; prepTime?: number } = {}) {
    const [recipe] = await db
        .insert(recipes)
        .values({
            name,
            description: "Babiččin recept",
            date: "2026-01-02T10:00:00.000Z",
            prepTime: fields.prepTime ?? 90,
            image: fields.image ?? null,
            portions: 4,
        })
        .returning();
    await db.insert(ingredients).values([
        { recipeId: recipe.id, name: "Mouka", amount: 500, unit: "g", note: "hladká" },
        { recipeId: recipe.id, name: "Mléko", amount: 0.5, unit: "l", note: null },
        { recipeId: recipe.id, name: "Sůl", amount: null, unit: "špetka", note: null },
    ]);
    await db.insert(steps).values([
        { recipeId: recipe.id, stepOrder: 0, content: "Smíchej mouku s mlékem." },
        { recipeId: recipe.id, stepOrder: 1, content: "Osol." },
        { recipeId: recipe.id, stepOrder: 2, content: "Peč 40 minut." },
    ]);
    return recipe;
}

async function loadRecipe(recipeId: number) {
    const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) });
    if (!recipe) return undefined;
    return { ...recipe, ...(await getRecipeDetails(recipeId)) };
}

// Same shape the edit form starts with (mapToFormValues in components/recipe-form.tsx).
async function editFormFor(recipeId: number): Promise<EditedRecipe> {
    const recipe = await loadRecipe(recipeId);
    if (!recipe) throw new Error(`recipe ${recipeId} not found`);
    const prepTime = recipe.prepTime ? parseHoursMinutes(recipe.prepTime) : { hours: 0, minutes: 0 };
    return {
        name: recipe.name,
        description: recipe.description ?? undefined,
        portions: recipe.portions,
        ...prepTime,
        image: recipe.image ?? undefined,
        ingredients: recipe.ingredients.map(({ name, note, amount, unit }) => ({
            name,
            note: note ?? undefined,
            amount: amount ?? undefined,
            unit,
        })),
        steps: recipe.steps.map(({ content }) => ({ content })),
    };
}

// Mirrors what components/recipe-form.tsx sends: the ingredient list always ends with an empty row.
function recipeFormData(edited: EditedRecipe) {
    const formData = new FormData();
    formData.append("name", edited.name);
    if (edited.description) formData.append("description", edited.description);
    formData.append("portions", String(edited.portions));
    formData.append("hours", String(edited.hours));
    formData.append("minutes", String(edited.minutes));
    if (edited.image) formData.append("image", edited.image);
    formData.append("ingredients", JSON.stringify([...edited.ingredients, { name: "", unit: "" }]));
    formData.append("steps", JSON.stringify(edited.steps));
    return formData;
}

async function submitEdit(recipeId: number, edited: EditedRecipe) {
    await expect(updateRecipe(recipeId, recipeFormData(edited))).rejects.toThrow(`NEXT_REDIRECT /recipes/${recipeId}`);
}

function ingredientRows(recipe: Awaited<ReturnType<typeof loadRecipe>>) {
    return recipe?.ingredients.map(({ name, amount, unit, note }) => ({ name, amount, unit, note }));
}

function stepRows(recipe: Awaited<ReturnType<typeof loadRecipe>>) {
    return recipe?.steps.map(({ stepOrder, content }) => ({ stepOrder, content }));
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

describe("updateRecipe", () => {
    it("keeps every ingredient and step when the recipe is saved without changes", async () => {
        const recipe = await insertRecipe("Palačinky", { image: "/uploads/palacinky.jpg" });
        const before = await loadRecipe(recipe.id);

        await submitEdit(recipe.id, await editFormFor(recipe.id));

        const after = await loadRecipe(recipe.id);
        expect(after).toMatchObject({
            name: before?.name,
            description: before?.description,
            date: before?.date,
            prepTime: before?.prepTime,
            image: before?.image,
            portions: before?.portions,
        });
        expect(ingredientRows(after)).toEqual(ingredientRows(before));
        expect(stepRows(after)).toEqual(stepRows(before));
    });

    it("saves the edited fields, ingredients and steps, then opens the recipe", async () => {
        const recipe = await insertRecipe("Palačinky");
        const form = await editFormFor(recipe.id);

        await submitEdit(recipe.id, {
            ...form,
            name: "Lívance",
            description: undefined,
            portions: 6,
            hours: 0,
            minutes: 30,
            ingredients: [
                { name: "Mouka", amount: 400, unit: "g", note: "polohrubá" },
                form.ingredients[1],
                { name: "Droždí", amount: 20, unit: "g" },
            ],
            steps: [form.steps[0], { content: "Nech vykynout." }],
        });

        const after = await loadRecipe(recipe.id);
        expect(after).toMatchObject({ name: "Lívance", description: null, portions: 6, prepTime: 30 });
        expect(ingredientRows(after)).toEqual([
            { name: "Mouka", amount: 400, unit: "g", note: "polohrubá" },
            { name: "Mléko", amount: 0.5, unit: "l", note: null },
            { name: "Droždí", amount: 20, unit: "g", note: null },
        ]);
        expect(stepRows(after)).toEqual([
            { stepOrder: 0, content: "Smíchej mouku s mlékem." },
            { stepOrder: 1, content: "Nech vykynout." },
        ]);
        expect(redirect).toHaveBeenCalledWith(`/recipes/${recipe.id}`);
    });

    it("keeps the creation date", async () => {
        const recipe = await insertRecipe("Palačinky");

        await submitEdit(recipe.id, { ...(await editFormFor(recipe.id)), name: "Palačinky s džemem" });

        expect((await loadRecipe(recipe.id))?.date).toBe("2026-01-02T10:00:00.000Z");
    });

    it("removes the image when the form sends none", async () => {
        const recipe = await insertRecipe("Palačinky", { image: "/uploads/palacinky.jpg" });

        await submitEdit(recipe.id, { ...(await editFormFor(recipe.id)), image: undefined });

        expect((await loadRecipe(recipe.id))?.image).toBeNull();
    });

    it("clears the prep time when it is set to zero", async () => {
        const recipe = await insertRecipe("Palačinky");

        await submitEdit(recipe.id, { ...(await editFormFor(recipe.id)), hours: 0, minutes: 0 });

        expect((await loadRecipe(recipe.id))?.prepTime).toBeNull();
    });

    it("leaves other recipes untouched", async () => {
        const edited = await insertRecipe("Palačinky");
        const other = await insertRecipe("Bábovka");
        const otherBefore = await loadRecipe(other.id);

        await submitEdit(edited.id, {
            ...(await editFormFor(edited.id)),
            ingredients: [{ name: "Vejce", amount: 2, unit: "ks" }],
            steps: [{ content: "Rozbij vejce." }],
        });

        expect(await loadRecipe(other.id)).toEqual(otherBefore);
    });

    it("keeps the original ingredients and steps when every ingredient row is blank", async () => {
        const recipe = await insertRecipe("Palačinky");
        const before = await loadRecipe(recipe.id);
        const form = await editFormFor(recipe.id);

        const submitted = updateRecipe(
            recipe.id,
            recipeFormData({ ...form, name: "Prázdné", ingredients: [{ name: " ", unit: "" }] }),
        );

        await expect(submitted).rejects.toThrow();
        expect(redirect).not.toHaveBeenCalled();
        expect(await loadRecipe(recipe.id)).toEqual(before);
    });

    it("keeps the original ingredients and steps when every step is blank", async () => {
        const recipe = await insertRecipe("Palačinky");
        const before = await loadRecipe(recipe.id);
        const form = await editFormFor(recipe.id);

        const submitted = updateRecipe(
            recipe.id,
            recipeFormData({ ...form, name: "Prázdné", steps: [{ content: "" }] }),
        );

        await expect(submitted).rejects.toThrow();
        expect(redirect).not.toHaveBeenCalled();
        expect(await loadRecipe(recipe.id)).toEqual(before);
    });

    it("creates nothing for a recipe that does not exist", async () => {
        const recipe = await insertRecipe("Palačinky");
        const form = await editFormFor(recipe.id);
        const missingRecipeId = recipe.id + 1000;

        await expect(updateRecipe(missingRecipeId, recipeFormData(form))).rejects.toThrow();

        expect(redirect).not.toHaveBeenCalled();
        expect(await db.query.ingredients.findMany({ where: eq(ingredients.recipeId, missingRecipeId) })).toEqual([]);
        expect(await db.query.steps.findMany({ where: eq(steps.recipeId, missingRecipeId) })).toEqual([]);
    });
});
