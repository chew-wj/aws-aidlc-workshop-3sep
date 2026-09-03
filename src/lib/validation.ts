/**
 * Input validation & sanitization (PR-007).
 *
 * Every write is validated at the handler boundary before persistence. Invalid
 * payloads are rejected with a ValidationError (→ HTTP 400) and never stored.
 */
export class ValidationError extends Error {
  public readonly details: string[];
  constructor(details: string[]) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export const ALLOWED_UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'piece',
  'pinch',
] as const;
export type Unit = (typeof ALLOWED_UNITS)[number];

const MAX_NAME = 120;
const MAX_INGREDIENTS = 100;

export interface IngredientInput {
  name: string;
  quantity: number;
  unit: Unit;
}

export interface RecipeInput {
  name: string;
  servings: number;
  ingredients: IngredientInput[];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function sanitizeString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Validates and returns a normalized RecipeInput, or throws ValidationError. */
export function parseRecipeInput(raw: unknown): RecipeInput {
  const errors: string[] = [];
  if (!isPlainObject(raw)) {
    throw new ValidationError(['body must be a JSON object']);
  }

  const name = sanitizeString(raw.name);
  if (!name) errors.push('name is required');
  else if (name.length > MAX_NAME)
    errors.push(`name must be <= ${MAX_NAME} characters`);

  const servings = raw.servings;
  if (typeof servings !== 'number' || !Number.isFinite(servings) || servings < 1) {
    errors.push('servings must be a number >= 1');
  }

  const rawIngredients = raw.ingredients;
  const ingredients: IngredientInput[] = [];
  if (!Array.isArray(rawIngredients) || rawIngredients.length === 0) {
    errors.push('ingredients must be a non-empty array');
  } else if (rawIngredients.length > MAX_INGREDIENTS) {
    errors.push(`ingredients must have <= ${MAX_INGREDIENTS} entries`);
  } else {
    rawIngredients.forEach((ing, i) => {
      if (!isPlainObject(ing)) {
        errors.push(`ingredients[${i}] must be an object`);
        return;
      }
      const iname = sanitizeString(ing.name);
      if (!iname) errors.push(`ingredients[${i}].name is required`);
      else if (iname.length > MAX_NAME)
        errors.push(`ingredients[${i}].name must be <= ${MAX_NAME} characters`);

      const qty = ing.quantity;
      if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0) {
        errors.push(`ingredients[${i}].quantity must be a number > 0`);
      }

      const unit = ing.unit;
      if (typeof unit !== 'string' || !ALLOWED_UNITS.includes(unit as Unit)) {
        errors.push(
          `ingredients[${i}].unit must be one of: ${ALLOWED_UNITS.join(', ')}`
        );
      }

      if (iname && typeof qty === 'number' && ALLOWED_UNITS.includes(unit as Unit)) {
        ingredients.push({ name: iname, quantity: qty, unit: unit as Unit });
      }
    });
  }

  if (errors.length > 0) throw new ValidationError(errors);

  return { name, servings: servings as number, ingredients };
}
