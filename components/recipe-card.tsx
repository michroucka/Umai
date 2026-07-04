import {ChefHat} from "lucide-react";
import {Card, CardAction, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Recipe} from "@/lib/types";
import {redirect} from "next/navigation";
import {parseHoursMinutes} from "@/lib/utils";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
    const prepTime = recipe.prepTime ? parseHoursMinutes(recipe.prepTime) : null;

    return (
        <div
            className="relative group select-none cursor-pointer hover:-translate-y-0.5 transition duration-250"
            onClick={() => redirect(`/recipes/${recipe.id}`) }
        >
            <Card className="w-full h-full pt-0 shadow-md hover:shadow-xl transition duration-250">
                {recipe.image != null ? (
                    <img
                        src={recipe.image}
                        alt="Recipe image"
                        className="aspect-video w-full object-cover"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ WebkitTouchCallout: 'none' }}
                    />
                ) : (
                    <div className="relative z-20 w-full aspect-video bg-muted/40 flex items-center justify-center">
                        <ChefHat className="size-20 text-muted" />
                    </div>
                )}
                <CardHeader>
                    <CardTitle className="font-semibold">{recipe.name}</CardTitle>
                    {recipe.description && <CardDescription className="">{recipe.description}</CardDescription>}
                    <CardAction>
                        {prepTime && (
                            <Badge>{prepTime.hours > 0 && `${prepTime.hours} h`} {prepTime.minutes > 0 && `${prepTime.minutes} min`}</Badge>
                        )}
                    </CardAction>
                </CardHeader>
            </Card>
        </div>
    )
}