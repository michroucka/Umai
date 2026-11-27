// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Ingredients } from "@/components/recipes/ingredients";
import type { Ingredient } from "@/lib/types";

afterEach(cleanup);

const ingredients: Ingredient[] = [
    { id: 1, recipeId: 1, name: "Mouka", amount: 500, unit: "g", note: null },
    { id: 2, recipeId: 1, name: "Mléko", amount: 0.5, unit: "l", note: "nebo {100 ml} smetany" },
    { id: 3, recipeId: 1, name: "Sůl", amount: null, unit: "dle chuti", note: null },
];

function lineOf(name: string) {
    return screen.getByText(name).parentElement?.textContent?.replace(/\s+/g, " ").trim();
}

function noteOf(name: string) {
    return screen.getByText(name).closest("li")?.querySelector(".text-muted-foreground")?.textContent;
}

describe("Ingredients", () => {
    it("shows the stored amounts for the original number of portions", () => {
        render(<Ingredients ingredients={ingredients} portionsFactor={1} />);

        expect(lineOf("Mouka")).toBe("Mouka • 500 g");
        expect(lineOf("Mléko")).toBe("Mléko • 0,5 l");
        expect(noteOf("Mléko")).toBe("nebo 100 ml smetany");
    });

    it("scales amounts and amounts in notes by the portions factor", () => {
        render(<Ingredients ingredients={ingredients} portionsFactor={1.5} />);

        expect(lineOf("Mouka")).toBe("Mouka • 750 g");
        expect(lineOf("Mléko")).toBe("Mléko • 0,75 l");
        expect(noteOf("Mléko")).toBe("nebo 150 ml smetany");
    });

    it("shows only the unit for an ingredient without an amount", () => {
        render(<Ingredients ingredients={ingredients} portionsFactor={2} />);

        expect(lineOf("Sůl")).toBe("Sůl • dle chuti");
    });
});
