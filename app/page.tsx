import { db } from "@/db";
import { recipes } from "@/db/schema";
import {RecipeList} from "@/components/recipe-list";

export const dynamic = "force-dynamic";


export default async function Home() {
  const allRecipes = await db.select().from(recipes);

  return (
      <div className="xl:pb-6">
        <RecipeList recipes={allRecipes} />
      </div>
  );
};
