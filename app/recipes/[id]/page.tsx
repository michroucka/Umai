import {db} from "@/db";
import {eq} from "drizzle-orm";
import {recipes} from "@/db/schema";
import {getRecipeDetails} from "@/lib/actions/get-recipe-details";
import {Recipe} from "@/app/recipe";
import {ChevronLeft, HeartCrack} from "lucide-react";
import {Button} from "@/components/ui/button";
import Link from "next/link";


export default async function RecipePage({ params }: { params: Promise<{id: string}> }) {
    const {id} = await params;
    const recipe = await db.query.recipes.findFirst({
        where: eq(recipes.id, Number(id))
    });
    const details = recipe ? await getRecipeDetails(recipe.id) : null;
    const data = recipe && details ? { ...recipe, ...details } : null ;

    if (data) {
        return (
            <Recipe recipe={data} />
        )
    }

    return (
        <>
            <div className="flex p-4 gap-2 justify-center text-2xl font-medium items-center text-muted pt-32">
                <h3>Recept nebyl nalezen</h3>
                <HeartCrack className="size-7" />
            </div>
            <Button variant="link" asChild>
                <Link href="/"><ChevronLeft /> Zpět na recepty</Link>
            </Button>
        </>
    )
}