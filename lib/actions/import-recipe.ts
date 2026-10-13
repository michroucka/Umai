"use server"

import Anthropic from "@anthropic-ai/sdk";
import {betaZodOutputFormat} from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod";
import {UNITS} from "@/lib/units";

const importedRecipeSchema = z.object({
    name: z.string(),
    description: z.string().nullable(),
    portions: z.number(),
    prepTimeMinutes: z.number().nullable(),
    imageUrl: z.string().nullable(),
    ingredients: z.array(z.object({
        name: z.string(),
        amount: z.number().nullable(),
        unit: z.string(),
        note: z.string().nullable(),
    })),
    steps: z.array(z.string()),
});

export type ImportedRecipe = z.infer<typeof importedRecipeSchema>;

export type ImportResult =
    | { ok: true; recipe: ImportedRecipe }
    | { ok: false; error: string };

const SYSTEM_PROMPT = `Jsi asistent, který převádí recepty do strukturované podoby pro českou receptovou aplikaci.

Dostaneš recept – buď jako strukturovaná data (schema.org JSON-LD), nebo jako text webové stránky či text vložený uživatelem. Vrať recept v požadovaném formátu:

- Vše přelož do přirozené češtiny (název, popis, ingredience, kroky). Pokud je recept už česky, jen ho učeš.
- Jednotky převeď na metrické. Preferuj tyto jednotky: ${UNITS.join(", ")} - ale s rozumem - vždy použij co nejlogičtější jednotku - např. u česneku stroužky atd. Cups, oz, lb apod. převeď na g nebo ml (u sypkých surovin raději na gramy). Kusové suroviny (vejce, cibule) mají jednotku "ks". Teploty převeď na °C.
- U surovin bez množství (sůl, pepř "podle chuti") dej amount null a unit "dle chuti" nebo "dle potřeby".
- Název suroviny piš krátce, v 1. pádě a s velkým počátečním písmenem (např. "Cibule", "Černý pepř"); upřesnění jako "nadrobno nakrájená" dej do note (malým písmenem).
- Kroky postupu seskup do ucelených fází přípravy (typicky 3–8 kroků, např. "příprava těsta", "příprava náplně", "pečení"). Jeden krok = několik souvisejících vět, ne jedna věta. Vynech triviální kroky jako "připravte si všechny suroviny" nebo "předehřejte troubu" samostatně – předehřátí zmiň v kroku, kam logicky patří. Kroky piš bez číslování a nadpisů na začátku.
- portions je počet porcí; pokud není uveden, odhadni ho rozumně podle množství.
- prepTimeMinutes je celkový čas přípravy v minutách, nebo null, pokud není znám.
- imageUrl je absolutní URL hlavního obrázku receptu, pokud je v podkladech, jinak null.
- description je krátký popis (1–2 věty), nebo null.
- Nic si nevymýšlej – pokud nějaká informace v podkladech není, použij null.

Uživatel může k receptu připojit doplňující pokyny (např. "přepočítej na 4 porce", "bez cibule"). Ty mají přednost před pravidly výše – uprav podle nich recept a nastav odpovídající hodnoty (např. portions a množství surovin).`;

export async function importRecipe(input: string, instructions?: string): Promise<ImportResult> {
    const trimmed = input.trim();
    if (!trimmed) return { ok: false, error: "Vložte URL nebo text receptu." };
    if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "Chybí ANTHROPIC_API_KEY v .env." };

    let source: string;
    const url = parseUrl(trimmed);
    if (url) {
        try {
            source = await fetchRecipeSource(url);
        } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : "Stránku se nepodařilo stáhnout." };
        }
    } else {
        source = trimmed;
    }

    try {
        const client = new Anthropic();
        const response = await client.beta.messages.parse({
            model: "claude-sonnet-5-5",
            max_tokens: 16000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: {
                effort: "low",
                format: betaZodOutputFormat(importedRecipeSchema),
            },
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: instructions?.trim()
                ? `${source}\n\nDoplňující pokyny uživatele:\n${instructions.trim()}`
                : source }],
        });

        if (response.stop_reason === "refusal") return { ok: false, error: "Model odmítl recept zpracovat." };
        if (response.stop_reason === "max_tokens") return { ok: false, error: "Recept je příliš dlouhý." };
        if (!response.parsed_output) return { ok: false, error: "Nepodařilo se rozpoznat recept." };

        const recipe = response.parsed_output;
        return {
            ok: true,
            recipe: {
                ...recipe,
                ingredients: recipe.ingredients.map(i => ({ ...i, name: capitalize(i.name.trim()) })),
            },
        };
    } catch (e) {
        if (e instanceof Anthropic.AuthenticationError) return { ok: false, error: "Neplatný API klíč." };
        if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "Příliš mnoho požadavků, zkuste to za chvíli." };
        if (e instanceof Anthropic.APIError) return { ok: false, error: `Chyba AI (${e.status}): ${e.message}` };
        throw e;
    }
}

function capitalize(text: string): string {
    return text.charAt(0).toLocaleUpperCase("cs-CZ") + text.slice(1);
}

function parseUrl(input: string): URL | null {
    if (/\s/.test(input)) return null;
    try {
        const url = new URL(input);
        return url.protocol === "http:" || url.protocol === "https:" ? url : null;
    } catch {
        return null;
    }
}

// Server běží v domácí síti – nedovolíme stahovat adresy z lokální sítě.
function isPrivateHost(hostname: string): boolean {
    return hostname === "localhost"
        || hostname.endsWith(".local")
        || hostname.startsWith("[")
        || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(hostname)
        || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
}

async function fetchRecipeSource(url: URL): Promise<string> {
    if (isPrivateHost(url.hostname)) throw new Error("Adresy z lokální sítě nejsou povolené.");

    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
            "Accept-Language": "cs,en;q=0.8",
        },
        signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Stránka vrátila chybu ${res.status}.`);
    const html = await res.text();

    const jsonLd = findJsonLdRecipe(html);
    if (jsonLd) return `Strukturovaná data receptu z ${url}:\n${JSON.stringify(jsonLd)}`;

    const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const text = htmlToText(html);
    if (text.length < 200) throw new Error("Na stránce se nepodařilo najít recept. Zkuste vložit text receptu.");

    return `Text stránky ${url}:${ogImage ? `\nObrázek: ${ogImage}` : ""}\n\n${text.slice(0, 100_000)}`;
}

function findJsonLdRecipe(html: string): unknown {
    const scripts = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const [, content] of scripts) {
        try {
            const recipe = findRecipeNode(JSON.parse(content));
            if (recipe) return recipe;
        } catch {
            // nevalidní JSON-LD přeskočíme
        }
    }
    return null;
}

function findRecipeNode(node: unknown): unknown {
    if (Array.isArray(node)) {
        for (const item of node) {
            const found = findRecipeNode(item);
            if (found) return found;
        }
        return null;
    }
    if (node && typeof node === "object") {
        const obj = node as Record<string, unknown>;
        const type = obj["@type"];
        if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) return obj;
        if (obj["@graph"]) return findRecipeNode(obj["@graph"]);
    }
    return null;
}

function htmlToText(html: string): string {
    return html
        .replace(/<(script|style|noscript|svg|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, " ")
        .replace(/<br\s*\/?>|<\/(p|li|h\d|div)>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n+/g, "\n")
        .trim();
}
