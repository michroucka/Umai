import {RecipeForm} from "@/components/recipe-form";
import {Separator} from "@/components/ui/separator";

export default async function NewRecipePage() {

    return (
        <div className="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
            <div className="pb-4 xl:shrink-0">
                <h1>Nový recept</h1>
                <Separator className="max-w-2/3 sm:max-w-1/3 mx-auto mt-2" />
            </div>
            <RecipeForm defaultRecipe={null} />
        </div>
    )
}