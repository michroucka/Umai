"use server"

export async function searchImages(query: string) {
    const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`,
        { headers: { Authorization: process.env.PEXELS_API_KEY! } }
    );
    const data = await res.json();
    return data.photos as { id: number; src: { medium: string; large: string } }[];
}