import { lookup } from "node:dns/promises";

export function capitalize(text: string): string {
    return text.charAt(0).toLocaleUpperCase("cs-CZ") + text.slice(1);
}

export function parseUrl(input: string): URL | null {
    if (/\s/.test(input)) return null;
    try {
        const url = new URL(input);
        return url.protocol === "http:" || url.protocol === "https:" ? url : null;
    } catch {
        return null;
    }
}

const MAX_REDIRECTS = 5;
const PRIVATE_HOST_ERROR = "Adresy z lokální sítě nejsou povolené.";

// Server běží v domácí síti a v tailnetu – nedovolíme stahovat adresy z lokální sítě.
// Přijímá hostname z URL (IPv6 v hranatých závorkách) i adresu z DNS (IPv6 bez závorek).
export function isPrivateHost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    if (host.startsWith("[")) return true;
    // IPv6 z DNS: povolíme jen globální unicast 2000::/3, vše ostatní (::1, fc00::/7, fe80::/10, ::ffff:…) blokujeme.
    if (host.includes(":")) return !/^[23][0-9a-f]{0,3}:/.test(host);
    return (
        host === "localhost" ||
        host.endsWith(".local") ||
        /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
        // 100.64.0.0/10 – CGNAT, používá ho Tailscale
        /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)
    );
}

// Kontroluje i adresy, na které se doména přeloží (např. 127.0.0.1.nip.io).
// Mezi kontrolou a stažením se DNS teoreticky může změnit (DNS rebinding); pro osobní aplikaci to akceptujeme.
async function assertPublicUrl(url: URL): Promise<void> {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Odkaz musí vést na webovou stránku.");
    if (isPrivateHost(url.hostname)) throw new Error(PRIVATE_HOST_ERROR);

    let addresses: { address: string }[];
    try {
        addresses = await lookup(url.hostname, { all: true });
    } catch {
        throw new Error("Stránku se nepodařilo najít.");
    }
    if (addresses.some(({ address }) => isPrivateHost(address))) throw new Error(PRIVATE_HOST_ERROR);
}

// Přesměrování procházíme ručně, aby každý cíl prošel kontrolou lokálních adres.
async function fetchPublicPage(url: URL): Promise<Response> {
    const signal = AbortSignal.timeout(15000);
    let current = url;
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
        await assertPublicUrl(current);
        const res = await fetch(current, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
                "Accept-Language": "cs,en;q=0.8",
            },
            redirect: "manual",
            signal,
        });
        const location = res.headers.get("location");
        if (res.status < 300 || res.status >= 400 || !location) return res;
        current = new URL(location, current);
    }
    throw new Error("Stránka přesměrovává příliš mnohokrát.");
}

export async function fetchRecipeSource(url: URL): Promise<string> {
    const res = await fetchPublicPage(url);
    if (!res.ok) throw new Error(`Stránka vrátila chybu ${res.status}.`);
    const html = await res.text();

    const jsonLd = findJsonLdRecipe(html);
    if (jsonLd) return `Strukturovaná data receptu z ${url}:\n${JSON.stringify(jsonLd)}`;

    const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const text = htmlToText(html);
    if (text.length < 200) throw new Error("Na stránce se nepodařilo najít recept. Zkuste vložit text receptu.");

    return `Text stránky ${url}:${ogImage ? `\nObrázek: ${ogImage}` : ""}\n\n${text.slice(0, 100_000)}`;
}

export function findJsonLdRecipe(html: string): unknown {
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

export function htmlToText(html: string): string {
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
