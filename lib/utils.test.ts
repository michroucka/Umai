import { describe, expect, it } from "vitest";
import { formatAmount, parseHoursMinutes, parsePrepTime, parseScalable } from "@/lib/utils";

describe("parsePrepTime", () => {
    it("converts hours and minutes to total minutes", () => {
        expect(parsePrepTime(1, 30)).toBe(90);
        expect(parsePrepTime(0, 45)).toBe(45);
        expect(parsePrepTime(2, 0)).toBe(120);
    });

    it("returns null when no time is given", () => {
        expect(parsePrepTime(0, 0)).toBeNull();
    });
});

describe("parseHoursMinutes", () => {
    it("splits total minutes into hours and minutes", () => {
        expect(parseHoursMinutes(90)).toEqual({ hours: 1, minutes: 30 });
        expect(parseHoursMinutes(45)).toEqual({ hours: 0, minutes: 45 });
        expect(parseHoursMinutes(120)).toEqual({ hours: 2, minutes: 0 });
    });

    it("is the inverse of parsePrepTime", () => {
        const { hours, minutes } = parseHoursMinutes(135);
        expect(parsePrepTime(hours, minutes)).toBe(135);
    });
});

describe("formatAmount", () => {
    it("rounds amounts of 10 and more to whole numbers", () => {
        expect(formatAmount(12.5)).toBe("13");
        expect(formatAmount(150)).toBe("150");
    });

    it("groups thousands with a no-break space (cs-CZ)", () => {
        expect(formatAmount(1500)).toBe("1 500");
    });

    it("keeps one decimal place with a comma for amounts from 1 to 10", () => {
        expect(formatAmount(1.25)).toBe("1,3");
        expect(formatAmount(2.5)).toBe("2,5");
        expect(formatAmount(2)).toBe("2");
    });

    it("keeps two decimal places for amounts below 1", () => {
        expect(formatAmount(0.5)).toBe("0,5");
        expect(formatAmount(1 / 3)).toBe("0,33");
    });

    it("hides floating point noise from portion scaling", () => {
        expect(formatAmount(0.1 * 3)).toBe("0,3");
        expect(formatAmount(200 * (3 / 4))).toBe("150");
    });
});

describe("parseScalable", () => {
    it("returns plain text as a single segment", () => {
        expect(parseScalable("Osolte a opepřete.")).toEqual([
            { type: "text", value: "Osolte a opepřete." },
        ]);
    });

    it("returns no segments for an empty string", () => {
        expect(parseScalable("")).toEqual([]);
    });

    it("parses an amount without a unit", () => {
        expect(parseScalable("Nakrájejte {1} cibuli")).toEqual([
            { type: "text", value: "Nakrájejte " },
            { type: "amount", value: 1, unit: "" },
            { type: "text", value: " cibuli" },
        ]);
    });

    it("parses an amount with a unit", () => {
        expect(parseScalable("přidejte {200 ml} vody")).toEqual([
            { type: "text", value: "přidejte " },
            { type: "amount", value: 200, unit: "ml" },
            { type: "text", value: " vody" },
        ]);
    });

    it("accepts a decimal comma and a decimal point", () => {
        expect(parseScalable("{0,5 lžičky}")).toEqual([{ type: "amount", value: 0.5, unit: "lžičky" }]);
        expect(parseScalable("{1.5 kg}")).toEqual([{ type: "amount", value: 1.5, unit: "kg" }]);
    });

    it("ignores whitespace inside the braces", () => {
        expect(parseScalable("{ 2 ks }")).toEqual([{ type: "amount", value: 2, unit: "ks" }]);
    });

    it("parses a range written as two amounts", () => {
        expect(parseScalable("cca {6}–{8 lžic}")).toEqual([
            { type: "text", value: "cca " },
            { type: "amount", value: 6, unit: "" },
            { type: "text", value: "–" },
            { type: "amount", value: 8, unit: "lžic" },
        ]);
    });

    it("parses a fraction", () => {
        expect(parseScalable("{1/2} cibule")).toEqual([
            { type: "amount", value: 0.5, unit: "" },
            { type: "text", value: " cibule" },
        ]);
        expect(parseScalable("{3/4 lžičky}")).toEqual([{ type: "amount", value: 0.75, unit: "lžičky" }]);
    });

    it("keeps a fraction with a zero denominator as text", () => {
        expect(parseScalable("{1/0 ks}")).toEqual([{ type: "text", value: "{1/0 ks}" }]);
    });

    it("keeps braces with a non-numeric content as text", () => {
        expect(parseScalable("přidejte {trochu} soli")).toEqual([
            { type: "text", value: "přidejte " },
            { type: "text", value: "{trochu}" },
            { type: "text", value: " soli" },
        ]);
    });
});
