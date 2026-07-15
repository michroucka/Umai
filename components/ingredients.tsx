"use client"

import {Ingredient} from "@/lib/types";
import {formatAmount} from "@/lib/utils";

export function Ingredients({ingredients, portionsFactor}: { ingredients: Ingredient[], portionsFactor: number }) {

    return (
        <ul className="list-disc ps-4 flex flex-col gap-1">
            <h4 className="mb-1 -ms-4">Ingredience</h4>
            {ingredients.map((ingredient) => {
                const amount = ingredient.amount ?
                    formatAmount(ingredient.amount * portionsFactor) : null;

                return (
                    <li key={ingredient.id}>
                        <span className="text-sm font-medium">
                            <span className="font-bold">{ingredient.name}</span> • {amount ?? ""} {ingredient.unit}
                        </span>
                        {ingredient.note &&
                            <span className="block text-sm text-muted-foreground">
                                {ingredient.note}
                            </span>
                        }
                    </li>
                )
            })}
        </ul>
    )
}