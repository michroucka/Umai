import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeFile } from "fs/promises";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { devices, ingredients, pairingCodes, recipes } from "@/db/schema";
import { createPairingCode, redeemPairingCode } from "@/lib/auth/devices";
import { DEVICE_COOKIE_NAME } from "@/lib/auth/session";
import { createRecipe } from "@/lib/actions/create-recipe";
import { deleteRecipe } from "@/lib/actions/delete-recipe";
import { getRecipeDetails } from "@/lib/actions/get-recipe-details";
import { importRecipe } from "@/lib/actions/import-recipe";
import { searchImages } from "@/lib/actions/search-images";
import { updateRecipe } from "@/lib/actions/update-recipe";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT ${url}`);
    }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("fs/promises", async (importOriginal) => ({
    ...(await importOriginal<typeof import("fs/promises")>()),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
}));

// Pairing is how a device gets in, so it has to stay reachable without one.
const ACTIONS_OPEN_TO_UNPAIRED_DEVICES = new Set(["pair-device.ts"]);

type ServerAction = (...args: unknown[]) => Promise<unknown>;

const actionsDir = import.meta.dirname;
const serverActionFiles = readdirSync(actionsDir).filter(
    (file) =>
        file.endsWith(".ts") &&
        !file.endsWith(".test.ts") &&
        readFileSync(path.join(actionsDir, file), "utf8").trimStart().startsWith('"use server"'),
);

const guardedServerActions: [string, ServerAction][] = [];
for (const file of serverActionFiles.filter((file) => !ACTIONS_OPEN_TO_UNPAIRED_DEVICES.has(file))) {
    const actionModule: Record<string, unknown> = await import(path.join(actionsDir, file));
    for (const [name, exported] of Object.entries(actionModule)) {
        if (typeof exported === "function") guardedServerActions.push([`${file}: ${name}`, exported as ServerAction]);
    }
}

let cookieJar: Map<string, string>;
const fetchMock = vi.fn();

beforeEach(async () => {
    await db.delete(recipes);
    await db.delete(devices);
    await db.delete(pairingCodes);

    cookieJar = new Map();
    vi.mocked(cookies).mockResolvedValue({
        get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
        set: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(writeFile).mockClear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(Response.json({ photos: [] }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("PEXELS_API_KEY", "test-key");
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

async function signIn() {
    const { code } = await createPairingCode();
    const paired = await redeemPairingCode(code, "Pixel 8");
    if (!paired) throw new Error("pairing failed");
    cookieJar.set(DEVICE_COOKIE_NAME, paired.token);
}

async function insertRecipe() {
    const [recipe] = await db.insert(recipes).values({ name: "Guláš", portions: 4 }).returning();
    await db.insert(ingredients).values({ recipeId: recipe.id, name: "Cibule", amount: 2, unit: "ks" });
    return recipe;
}

function recipeForm(name: string) {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", "");
    formData.set("hours", "1");
    formData.set("minutes", "30");
    formData.set("portions", "4");
    formData.set("ingredients", JSON.stringify([{ name: "Cibule", note: "", amount: 2, unit: "ks" }]));
    formData.set("steps", JSON.stringify([{ content: "Nakrájejte cibuli." }]));
    formData.set("image", new File(["jpeg-bytes"], "gulas.jpg", { type: "image/jpeg" }));
    return formData;
}

describe("server actions without a paired device", () => {
    it("finds the recipe actions, so the check below is not vacuous", () => {
        expect(guardedServerActions.map(([name]) => name)).toEqual(
            expect.arrayContaining([
                "create-recipe.ts: createRecipe",
                "delete-recipe.ts: deleteRecipe",
                "get-recipe-details.ts: getRecipeDetails",
                "import-recipe.ts: importRecipe",
                "search-images.ts: searchImages",
                "update-recipe.ts: updateRecipe",
            ]),
        );
    });

    // Every export of a "use server" file is a public POST endpoint, whatever the UI calls.
    it.each(guardedServerActions)("%s redirects to /pair before touching its arguments", async (_, action) => {
        await expect(Promise.resolve().then(() => action())).rejects.toThrow("NEXT_REDIRECT /pair");
    });

    it("createRecipe stores no recipe and writes no image", async () => {
        await expect(createRecipe(recipeForm("Vetřelec"))).rejects.toThrow("NEXT_REDIRECT /pair");

        expect(await db.select().from(recipes)).toHaveLength(0);
        expect(writeFile).not.toHaveBeenCalled();
    });

    it("updateRecipe leaves the recipe unchanged", async () => {
        const recipe = await insertRecipe();

        await expect(updateRecipe(recipe.id, recipeForm("Vetřelec"))).rejects.toThrow("NEXT_REDIRECT /pair");

        const [stored] = await db.select().from(recipes).where(eq(recipes.id, recipe.id));
        expect(stored.name).toBe("Guláš");
        expect(writeFile).not.toHaveBeenCalled();
    });

    it("deleteRecipe keeps the recipe", async () => {
        const recipe = await insertRecipe();

        await expect(deleteRecipe(recipe.id)).rejects.toThrow("NEXT_REDIRECT /pair");

        expect(await db.select().from(recipes)).toHaveLength(1);
    });

    it("importRecipe neither downloads the page nor calls the AI (both cost money or leak the server)", async () => {
        await expect(importRecipe("https://example.com/gulas")).rejects.toThrow("NEXT_REDIRECT /pair");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("searchImages does not call Pexels", async () => {
        await expect(searchImages("guláš")).rejects.toThrow("NEXT_REDIRECT /pair");
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe("server actions with a paired device", () => {
    beforeEach(signIn);

    it("deleteRecipe deletes the recipe", async () => {
        const recipe = await insertRecipe();

        await deleteRecipe(recipe.id);

        expect(await db.select().from(recipes)).toHaveLength(0);
    });

    it("getRecipeDetails returns the ingredients", async () => {
        const recipe = await insertRecipe();

        const details = await getRecipeDetails(recipe.id);

        expect(details.ingredients.map((ingredient) => ingredient.name)).toEqual(["Cibule"]);
    });

    it("searchImages asks Pexels", async () => {
        await searchImages("guláš");
        expect(fetchMock).toHaveBeenCalledOnce();
    });
});
