// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Recipe } from "@/components/recipe";
import type { RecipeWithDetails } from "@/lib/types";

vi.mock("@/lib/actions/delete-recipe", () => ({ deleteRecipe: vi.fn() }));

afterEach(cleanup);

const pancakes: RecipeWithDetails = {
    id: 1,
    name: "Palačinky",
    description: null,
    date: "2026-01-02T10:00:00.000Z",
    prepTime: 30,
    image: null,
    portions: 4,
    ingredients: [
        { id: 1, recipeId: 1, name: "Mouka", amount: 500, unit: "g", note: null },
        { id: 2, recipeId: 1, name: "Mléko", amount: 0.5, unit: "l", note: "nebo {100 ml} smetany" },
        { id: 3, recipeId: 1, name: "Sůl", amount: null, unit: "dle chuti", note: null },
    ],
    steps: [{ id: 1, recipeId: 1, stepOrder: 0, content: "Smíchej {500 g} mouky s mlékem." }],
};

function renderRecipe(recipe = pancakes) {
    render(<Recipe recipe={recipe} />);
}

function portionsField() {
    return screen.getByRole<HTMLInputElement>("spinbutton");
}

// The minus and plus buttons are icon-only and have no accessible name, so they are found next to the field.
function portionButtons() {
    const [fewer, more] = within(portionsField().parentElement!).getAllByRole<HTMLButtonElement>("button");
    return { fewer, more };
}

function ingredientLine(name: string) {
    return screen.getByText(name).closest("label")?.textContent?.replace(/\s+/g, " ").trim();
}

function ingredientNote(text: string) {
    return screen.getByText((_, element) => element?.tagName === "P" && element.textContent === text);
}

async function setPortions(value: string) {
    const user = userEvent.setup();
    await user.click(portionsField());
    await user.keyboard(value);
}

describe("Recipe portions", () => {
    it("starts with the recipe's portions and its stored amounts", () => {
        renderRecipe();

        expect(portionsField().value).toBe("4");
        expect(ingredientLine("Mouka")).toBe("Mouka • 500 g");
        expect(ingredientLine("Mléko")).toBe("Mléko • 0,5 l");
        expect(ingredientLine("Sůl")).toBe("Sůl • dle chuti");
    });

    it("scales ingredients, their notes and the steps when a portion is added", async () => {
        renderRecipe();

        await userEvent.setup().click(portionButtons().more);

        expect(portionsField().value).toBe("5");
        expect(ingredientLine("Mouka")).toBe("Mouka • 625 g");
        expect(ingredientLine("Mléko")).toBe("Mléko • 0,63 l");
        expect(ingredientNote("nebo 125 ml smetany")).toBeTruthy();
        expect(screen.getByText("625 g").closest("span.whitespace-pre-wrap")?.textContent).toBe(
            "Smíchej 625 g mouky s mlékem.",
        );
    });

    it("scales the amounts down when a portion is removed", async () => {
        renderRecipe();

        await userEvent.setup().click(portionButtons().fewer);

        expect(portionsField().value).toBe("3");
        expect(ingredientLine("Mouka")).toBe("Mouka • 375 g");
    });

    it("scales the amounts to portions typed into the field", async () => {
        renderRecipe();

        await setPortions("8");

        expect(portionsField().value).toBe("8");
        expect(ingredientLine("Mouka")).toBe("Mouka • 1 000 g");
        expect(ingredientLine("Mléko")).toBe("Mléko • 1 l");
        expect(ingredientLine("Sůl")).toBe("Sůl • dle chuti");
    });

    it("does not go below one portion", async () => {
        renderRecipe({ ...pancakes, portions: 1 });

        expect(portionButtons().fewer.disabled).toBe(true);

        await setPortions("0");

        expect(portionsField().value).toBe("1");
        expect(ingredientLine("Mouka")).toBe("Mouka • 500 g");
    });

    it("does not go above 99 portions", async () => {
        renderRecipe();

        await setPortions("150");

        expect(portionsField().value).toBe("99");
        expect(portionButtons().more.disabled).toBe(true);
    });
});
