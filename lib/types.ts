import {InferSelectModel} from "drizzle-orm";
import {recipes, ingredients, steps} from "@/db/schema";

export type Recipe = InferSelectModel<typeof recipes>;
export type Ingredient = InferSelectModel<typeof ingredients>;
export type Step = InferSelectModel<typeof steps>;

export type RecipeWithDetails = Recipe & {
    ingredients: Ingredient[];
    steps: Step[];
}