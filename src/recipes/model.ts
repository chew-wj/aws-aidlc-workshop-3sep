import type { IngredientInput, RecipeInput } from '../lib/validation';

export interface Recipe {
  recipeId: string;
  userId: string;
  name: string;
  servings: number;
  ingredients: IngredientInput[];
  createdAt: string;
  updatedAt: string;
}

/** Scales ingredient quantities from the recipe's base servings (PR-005). */
export function scaleRecipe(recipe: Recipe, targetServings: number): Recipe {
  if (targetServings <= 0) return recipe;
  const factor = targetServings / recipe.servings;
  return {
    ...recipe,
    servings: targetServings,
    ingredients: recipe.ingredients.map((ing) => ({
      ...ing,
      quantity: Math.round(ing.quantity * factor * 1000) / 1000,
    })),
  };
}

export function buildRecipe(
  userId: string,
  recipeId: string,
  input: RecipeInput,
  now: string
): Recipe {
  return {
    recipeId,
    userId,
    name: input.name,
    servings: input.servings,
    ingredients: input.ingredients,
    createdAt: now,
    updatedAt: now,
  };
}

export type { IngredientInput };
