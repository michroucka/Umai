"use client"

import {Card, CardAction, CardFooter, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import Image from "next/image"
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {ChefHat, Eye, Funnel, HeartCrack, Plus, Search, SquarePen} from "lucide-react";
import { recipes as recipesTable } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";
import {useState} from "react";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group";
import Link from "next/link";

type Recipe = InferSelectModel<typeof recipesTable>;

export function RecipeList({ recipes }: { recipes: Recipe[] }) {
    const [ nameFilter, setNameFilter ] = useState<string>("");

    const filteredRecipes = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(nameFilter.toLowerCase())
    )

    return (
        <>
            <div className="fixed bottom-6 right-6 flex flex-col gap-3 sm:hidden z-50">
                <Button size="icon-xl" variant="secondary">
                    <Funnel className="size-7" />
                </Button>
                <Button size="icon-xl" asChild>
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
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {filteredRecipes.map((recipe) => (
                        <Card
                            key={recipe.id}
                            className="relative mx-auto w-full pt-0"
                        >
                            {recipe.image != null ? (
                                <Image
                                    src={recipe.image}
                                    alt="Recipe image"
                                    width={320} height={160}
                                    className="aspect-video w-full object-cover"
                                />
                            ) : (
                                <div className="relative z-20 w-full h-40 aspect-video bg-muted/40 flex items-center justify-center">
                                    <ChefHat className="size-20 text-muted" />
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="font-semibold">{recipe.name}</CardTitle>
                                <CardDescription>{recipe.description}</CardDescription>
                                <CardAction>
                                    {recipe.prepTime !== null && (
                                        <Badge>{recipe.prepTime} min</Badge>
                                    )}
                                </CardAction>
                            </CardHeader>
                            <CardFooter>
                                <div className="w-full flex flex-row gap-4">
                                    <Button variant="secondary" size="lg" className="flex-1 font-semibold">
                                        <SquarePen className="size-5" /> Upravit
                                    </Button>
                                    <Button size="lg" className="flex-1 font-semibold">
                                        <Eye className="size-5" /> Zobrazit
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </>
    )
}
