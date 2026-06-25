"use client"

import {Button} from "@/components/ui/button";
import {Funnel, HeartCrack, Plus, Search} from "lucide-react";
import {useState} from "react";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group";
import Link from "next/link";
import {Recipe, RecipeCard} from "@/components/recipe-card";


export function RecipeList({ recipes }: { recipes: Recipe[] }) {
    const [ nameFilter, setNameFilter ] = useState<string>("");

    const filteredRecipes = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(nameFilter.toLowerCase())
    )

    return (
        <>
            <div className="fixed bottom-6 right-4 flex flex-col gap-3 sm:hidden z-50">
                <Button size="icon-xl" className="rounded-full" variant="secondary">
                    <Funnel className="size-7" />
                </Button>
                <Button size="icon-xl" className="rounded-full" asChild>
                    <Link href="/recipes/new"><Plus className="size-7" /></Link>
                </Button>
            </div>
            <div className="flex justify-between mb-6">
                <InputGroup className="w-full sm:max-w-100">
                    <InputGroupInput placeholder="Hledat..." onChange={(e) => setNameFilter(e.target.value)} />
                    <InputGroupAddon>
                        <Search />
                    </InputGroupAddon>
                    <InputGroupAddon align="inline-end">
                        {filteredRecipes.length} {filteredRecipes.length > 1 ? (filteredRecipes.length > 4 ? "receptů" : "recepty") : (filteredRecipes.length < 1 ? "receptů" : "recept")}
                    </InputGroupAddon>
                </InputGroup>
                <div className="hidden sm:flex gap-2">
                    <Button variant="secondary">
                        <Funnel /> Filtrovat
                    </Button>
                    <Button asChild>
                        <Link href="/recipes/new"><Plus /> Přidat</Link>
                    </Button>
                </div>
            </div>
            {filteredRecipes.length === 0 ? (
                <div className="flex p-8 gap-2 justify-center text-2xl font-medium items-center text-muted">
                    <h1>Žádné recepty</h1>
                    <HeartCrack className="size-7" />
                </div>
            ) : (
                <div className="grid gap-4 max-sm:mb-36" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                    {filteredRecipes.map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            )}
        </>
    )
}
