import { describe, expect, it } from "vitest";
import { formatPragueDateTime } from "@/lib/format-date";

describe("formatPragueDateTime", () => {
    it("shows the time in Prague, not in UTC", () => {
        expect(formatPragueDateTime(new Date("2026-11-22T12:00:00Z"))).toContain("13:00");
        expect(formatPragueDateTime(new Date("2026-07-22T12:00:00Z"))).toContain("14:00");
    });

    it("shows the date in the Czech format", () => {
        expect(formatPragueDateTime(new Date("2026-11-22T12:00:00Z"))).toMatch(/^22\.\s11\.\s2026/);
    });
});
