import {RecipeForm} from "@/components/recipe-form";
import {Separator} from "@/components/ui/separator";

export default async function NewRecipePage() {

    return (
        <>
            <div className="pb-4">
                <h1>Nový recept</h1>
                <Separator className="max-w-2/3 sm:max-w-1/3 mx-auto mt-2" />
            </div>
            <RecipeForm />
        </>
    )
}