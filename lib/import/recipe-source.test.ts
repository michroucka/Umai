import { lookup } from "node:dns/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    capitalize,
    fetchRecipeSource,
    findJsonLdRecipe,
    htmlToText,
    isPrivateHost,
    parseUrl,
} from "@/lib/import/recipe-source";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
const lookupMock = vi.mocked(lookup) as unknown as ReturnType<typeof vi.fn>;

const recipeJsonLd = { "@type": "Recipe", name: "Svíčková" };
const jsonLdScript = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
const longText = "Nakrájejte cibuli a osmahněte ji na másle. ".repeat(10);

describe("capitalize", () => {
    it("uppercases the first letter including Czech diacritics", () => {
        expect(capitalize("cibule")).toBe("Cibule");
        expect(capitalize("černý pepř")).toBe("Černý pepř");
    });

    it("leaves an empty string empty", () => {
        expect(capitalize("")).toBe("");
    });
});

describe("parseUrl", () => {
    it("accepts http and https URLs", () => {
        expect(parseUrl("https://www.recepty.cz/recept/svickova")?.hostname).toBe("www.recepty.cz");
        expect(parseUrl("http://example.com")?.protocol).toBe("http:");
    });

    it("rejects other protocols", () => {
        expect(parseUrl("ftp://example.com/recept.txt")).toBeNull();
        expect(parseUrl("javascript:alert(1)")).toBeNull();
    });

    it("treats text with whitespace as a pasted recipe, not a URL", () => {
        expect(parseUrl("https://example.com a pak text receptu")).toBeNull();
        expect(parseUrl("Svíčková na smetaně")).toBeNull();
    });
});

describe("isPrivateHost", () => {
    it.each([
        "localhost",
        "nas.local",
        "127.0.0.1",
        "10.0.0.5",
        "192.168.1.10",
        "172.16.0.1",
        "172.31.255.255",
        "169.254.1.1",
        "0.0.0.0",
        "[::1]",
        "LOCALHOST",
        "100.64.0.1",
        "100.101.102.103",
        "100.127.255.255",
    ])("blocks %s", (hostname) => {
        expect(isPrivateHost(hostname)).toBe(true);
    });

    it.each(["www.recepty.cz", "8.8.8.8", "172.15.0.1", "172.32.0.1", "100.63.255.255", "100.128.0.1"])(
        "allows %s",
        (hostname) => {
            expect(isPrivateHost(hostname)).toBe(false);
        },
    );

    it.each(["::1", "::", "fd7a:115c:a1e0::1", "fe80::1", "::ffff:192.168.1.10"])(
        "blocks IPv6 address %s from DNS",
        (address) => {
            expect(isPrivateHost(address)).toBe(true);
        },
    );

    it("allows a global IPv6 address from DNS", () => {
        expect(isPrivateHost("2a00:1450:4014:80d::200e")).toBe(false);
    });

    it("blocks loopback written as a decimal number, because URL normalizes it", () => {
        expect(isPrivateHost(new URL("http://2130706433/").hostname)).toBe(true);
    });
});

describe("findJsonLdRecipe", () => {
    it("finds a top-level Recipe node", () => {
        expect(findJsonLdRecipe(jsonLdScript(recipeJsonLd))).toEqual(recipeJsonLd);
    });

    it("finds a Recipe when @type is an array", () => {
        const node = { "@type": ["Recipe", "NewsArticle"], name: "Bábovka" };
        expect(findJsonLdRecipe(jsonLdScript(node))).toEqual(node);
    });

    it("finds a Recipe inside @graph", () => {
        const html = jsonLdScript({ "@graph": [{ "@type": "WebPage" }, recipeJsonLd] });
        expect(findJsonLdRecipe(html)).toEqual(recipeJsonLd);
    });

    it("finds a Recipe inside a top-level array", () => {
        expect(findJsonLdRecipe(jsonLdScript([{ "@type": "Organization" }, recipeJsonLd]))).toEqual(recipeJsonLd);
    });

    it("skips invalid JSON-LD and keeps searching", () => {
        const html = `<script type="application/ld+json">{ broken</script>${jsonLdScript(recipeJsonLd)}`;
        expect(findJsonLdRecipe(html)).toEqual(recipeJsonLd);
    });

    it("accepts single-quoted script attributes", () => {
        const html = `<script type='application/ld+json'>${JSON.stringify(recipeJsonLd)}</script>`;
        expect(findJsonLdRecipe(html)).toEqual(recipeJsonLd);
    });

    it("returns null when the page has no Recipe", () => {
        expect(findJsonLdRecipe(jsonLdScript({ "@type": "WebPage" }))).toBeNull();
        expect(findJsonLdRecipe("<p>Bez dat</p>")).toBeNull();
    });
});

describe("htmlToText", () => {
    it("drops scripts, styles and page chrome", () => {
        const html = "<header>Menu</header><script>track()</script><style>p{}</style><p>Recept</p><footer>©</footer>";
        expect(htmlToText(html)).toBe("Recept");
    });

    it("turns block ends and line breaks into newlines", () => {
        const lines = htmlToText("<p>Krok 1</p><p>Krok 2<br>pokračování</p>")
            .split("\n")
            .map((line) => line.trim());
        expect(lines).toEqual(["Krok 1", "Krok 2", "pokračování"]);
    });

    it("decodes the common entities and collapses whitespace", () => {
        expect(htmlToText("<span>Sůl&nbsp;&amp;   pepř</span>")).toBe("Sůl & pepř");
    });
});

describe("fetchRecipeSource", () => {
    beforeEach(() => {
        lookupMock.mockResolvedValue([{ address: "93.184.215.14", family: 4 }]);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        lookupMock.mockReset();
    });

    function stubFetch(body: string, status = 200) {
        const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status }));
        vi.stubGlobal("fetch", fetchMock);
        return fetchMock;
    }

    const redirectTo = (location: string) => new Response(null, { status: 302, headers: { location } });

    it("refuses private hosts without making a request", async () => {
        const fetchMock = stubFetch("");
        await expect(fetchRecipeSource(new URL("http://192.168.1.10/recept"))).rejects.toThrow("lokální sítě");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("refuses a domain that resolves to a private address", async () => {
        lookupMock.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
        const fetchMock = stubFetch("");
        await expect(fetchRecipeSource(new URL("http://127.0.0.1.nip.io/recept"))).rejects.toThrow("lokální sítě");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("refuses a domain when any of its addresses is private", async () => {
        lookupMock.mockResolvedValue([
            { address: "93.184.215.14", family: 4 },
            { address: "100.101.1.2", family: 4 },
        ]);
        await expect(fetchRecipeSource(new URL("https://example.com/recept"))).rejects.toThrow("lokální sítě");
    });

    it("reports a domain that does not exist", async () => {
        lookupMock.mockRejectedValue(new Error("ENOTFOUND"));
        await expect(fetchRecipeSource(new URL("https://neexistuje.example/recept"))).rejects.toThrow(
            "nepodařilo najít",
        );
    });

    it("follows a redirect to another public page", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(redirectTo("/recept-novy"))
            .mockResolvedValueOnce(new Response(jsonLdScript(recipeJsonLd)));
        vi.stubGlobal("fetch", fetchMock);
        await expect(fetchRecipeSource(new URL("https://example.com/recept"))).resolves.toContain("Svíčková");
        expect(fetchMock.mock.calls[1][0].href).toBe("https://example.com/recept-novy");
    });

    it("refuses a redirect to a private address", async () => {
        const fetchMock = vi.fn().mockResolvedValue(redirectTo("http://192.168.1.10/admin"));
        vi.stubGlobal("fetch", fetchMock);
        await expect(fetchRecipeSource(new URL("https://example.com/recept"))).rejects.toThrow("lokální sítě");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("refuses a redirect to a non-web protocol", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(redirectTo("file:///etc/passwd")));
        await expect(fetchRecipeSource(new URL("https://example.com/recept"))).rejects.toThrow("webovou stránku");
    });

    it("gives up after too many redirects", async () => {
        const fetchMock = vi.fn().mockImplementation(async () => redirectTo("https://example.com/znovu"));
        vi.stubGlobal("fetch", fetchMock);
        await expect(fetchRecipeSource(new URL("https://example.com/recept"))).rejects.toThrow("příliš mnohokrát");
        expect(fetchMock).toHaveBeenCalledTimes(6);
    });

    it("reports the HTTP status of a failed page", async () => {
        stubFetch("Not found", 404);
        await expect(fetchRecipeSource(new URL("https://example.com/recept"))).rejects.toThrow("404");
    });

    it("prefers structured JSON-LD data", async () => {
        stubFetch(`<html>${jsonLdScript(recipeJsonLd)}<p>${longText}</p></html>`);
        const source = await fetchRecipeSource(new URL("https://example.com/recept"));
        expect(source).toBe(
            `Strukturovaná data receptu z https://example.com/recept:\n${JSON.stringify(recipeJsonLd)}`,
        );
    });

    it("falls back to page text and includes the og:image", async () => {
        stubFetch(`<meta property="og:image" content="https://example.com/foto.jpg"><p>${longText}</p>`);
        const source = await fetchRecipeSource(new URL("https://example.com/recept"));
        expect(source).toContain("Obrázek: https://example.com/foto.jpg");
        expect(source).toContain("Nakrájejte cibuli");
    });

    it("fails when the page has too little text to be a recipe", async () => {
        stubFetch("<p>Přihlaste se</p>");
        await expect(fetchRecipeSource(new URL("https://example.com/recept"))).rejects.toThrow(
            "nepodařilo najít recept",
        );
    });
});
