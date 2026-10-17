import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  date: text("date"),
  prepTime: integer("prep_time"),
  image: text("image"),
  portions: integer("portions").notNull(),
});

export const ingredients = sqliteTable("ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, {onDelete: "cascade"}),
  name: text("name").notNull(),
  note: text("note"),
  // TODO: support amount ranges (e.g. "6–8 lžic")
  // - amount holds a single number, so a range from the source recipe can't
  //   be stored; notes and steps already support it via "{6}–{8 lžic}".
  // - Probably a nullable second column (e.g. amountMax) plus a migration,
  //   then: recipe form field, display + scaling in recipe.tsx and
  //   ingredients.tsx, the importedRecipeSchema in import-recipe.ts and
  //   a prompt rule for ranges in the amount field.
  amount: real("amount"),
  unit: text("unit").notNull(),
});

export const steps = sqliteTable("steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, {onDelete: "cascade"}),
  stepOrder: integer("step_order").notNull(),
  content: text("content").notNull(),
});
