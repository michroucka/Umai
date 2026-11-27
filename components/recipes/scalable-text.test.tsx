// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ScalableText } from "@/components/recipes/scalable-text";

afterEach(cleanup);

function renderedText(text: string, factor: number) {
    const { container } = render(<ScalableText text={text} factor={factor} />);
    return container.textContent;
}

describe("ScalableText", () => {
    it("shows amounts unchanged for the original number of portions", () => {
        expect(renderedText("Přidej {200 g} mouky.", 1)).toBe("Přidej 200 g mouky.");
    });

    it("scales every amount and keeps its unit and the text around it", () => {
        expect(renderedText("Smíchej {200 g} mouky a {2 ks} vajec.", 2)).toBe("Smíchej 400 g mouky a 4 ks vajec.");
    });

    it("scales an amount without a unit", () => {
        expect(renderedText("Rozděl na {4} díly.", 1.5)).toBe("Rozděl na 6 díly.");
    });

    it("scales both ends of a range", () => {
        expect(renderedText("Přidej {6}–{8 lžic} vody.", 0.5)).toBe("Přidej 3–4 lžic vody.");
    });

    it("scales fractions and decimal commas and shows them with a decimal comma", () => {
        expect(renderedText("{1/2 lžičky} soli a {0,5 l} mléka", 3)).toBe("1,5 lžičky soli a 1,5 l mléka");
    });

    it("rounds the scaled amount like the ingredient list does", () => {
        expect(renderedText("{1/3 hrnku}", 1)).toBe("0,33 hrnku");
        expect(renderedText("{100 g}", 1 / 3)).toBe("33 g");
    });

    it("highlights the scaled amounts", () => {
        const { container } = render(<ScalableText text="Přidej {200 g} mouky." factor={1} />);

        expect(container.querySelector(".font-semibold")?.textContent).toBe("200 g");
    });

    it("keeps braces without a number as plain text", () => {
        expect(renderedText("Osol {trochu}.", 2)).toBe("Osol {trochu}.");
    });
});
