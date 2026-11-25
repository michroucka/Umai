import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { E2E_DATABASE_PATH } from "../playwright.config";

function createPairingCode() {
    const output = execFileSync("node", ["scripts/create-pairing-code.mjs"], {
        env: { ...process.env, DATABASE_PATH: E2E_DATABASE_PATH },
    }).toString();
    const code = output.match(/[A-Z0-9]{4}-[A-Z0-9]{4}/)?.[0];
    if (!code) throw new Error(`No pairing code in: ${output}`);
    return code;
}

async function addIngredient(page: Page, index: number, ingredient: { name: string; amount: string; unit: string }) {
    // Typing into the last, empty row adds a new empty row below it.
    await page.locator(`[name="ingredients.${index}.name"]`).fill(ingredient.name);
    await page.locator(`[name="ingredients.${index}.amount"]`).fill(ingredient.amount);
    await page.getByRole("combobox", { name: "Jednotka" }).nth(index).fill(ingredient.unit);
    await page.getByRole("option", { name: ingredient.unit, exact: true }).click();
}

test("pair, create a recipe, open it, change portions and delete it", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/pair$/);
    await page.getByLabel("Párovací kód").fill(createPairingCode().replace("-", ""));
    await expect(page).toHaveURL("/");

    await page.goto("/recipes/new");
    await page.getByLabel("Název receptu").fill("Palačinky");
    await page.getByLabel("Počet porcí").fill("4");
    await addIngredient(page, 0, { name: "Mouka", amount: "500", unit: "g" });
    await addIngredient(page, 1, { name: "Mléko", amount: "250", unit: "ml" });
    await page.locator('[name="steps.0.content"]').fill("Smíchej {500 g} mouky s mlékem.");
    await page.getByRole("button", { name: "Uložit" }).click();

    await expect(page).toHaveURL("/");
    await page.getByText("Palačinky").click();
    await expect(page.getByRole("heading", { name: "Palačinky" })).toBeVisible();
    await expect(page.getByText("Mouka • 500 g")).toBeVisible();

    await page.getByRole("spinbutton").fill("6");
    await expect(page.getByText("Mouka • 750 g")).toBeVisible();
    await expect(page.getByText("Mléko • 375 ml")).toBeVisible();
    await expect(page.getByText("Smíchej 750 g mouky s mlékem.")).toBeVisible();

    // The delete button is icon-only and has no accessible name; it sits right after "Upravit".
    await page.getByRole("link", { name: "Upravit" }).locator("xpath=following-sibling::button").click();
    await page.getByRole("dialog", { name: "Smazat recept" }).getByRole("link", { name: "Smazat" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Žádné recepty" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Žádné recepty" })).toBeVisible();
});
