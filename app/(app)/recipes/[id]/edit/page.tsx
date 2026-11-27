import { RecipeForm } from "@/components/recipes/recipe-form";
import { Separator } from "@/components/ui/separator";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getRecipeDetails } from "@/lib/actions/get-recipe-details";
import { IconChevronLeft, IconHeartBroken } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageTransition } from "@/components/layout/page-transition";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const recipe = await db.query.recipes.findFirst({
        where: eq(recipes.id, Number(id)),
    });
    const details = recipe ? await getRecipeDetails(recipe.id) : null;
    const data = recipe && details ? { ...recipe, ...details } : null;

    return (
        <PageTransition>
            {data ? (
                <div className="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
                    <div className="pb-4 xl:shrink-0">
                        <h1>Upravit recept</h1>
                        <Separator className="max-w-2/3 sm:max-w-1/3 mx-auto mt-2" />
                    </div>
                    <RecipeForm defaultRecipe={data} />
                </div>
            ) : (
                <div className="xl:pb-6">
                    <div className="flex p-4 gap-2 justify-center text-2xl font-medium items-center text-muted pt-32">
                        <h3>Recept nebyl nalezen</h3>
                        <IconHeartBroken className="size-7" />
                    </div>
                    <Button variant="link" asChild>
                        <Link href="/">
                            <IconChevronLeft /> Zpět na recepty
                        </Link>
                    </Button>
                </div>
            )}
        </PageTransition>
    );
}
