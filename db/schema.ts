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
  description: text("description"),
  amount: real("amount"),
  unit: text("unit").notNull(),
});

export const steps = sqliteTable("steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, {onDelete: "cascade"}),
  stepOrder: integer("step_order").notNull(),
  content: text("content").notNull(),
});
