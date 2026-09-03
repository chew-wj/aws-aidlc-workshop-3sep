import { buildRecipe, scaleRecipe } from './model';

const now = '2026-09-03T00:00:00.000Z';
const base = buildRecipe(
  'user-1',
  'r-1',
  {
    name: 'Pasta',
    servings: 2,
    ingredients: [
      { name: 'penne', quantity: 200, unit: 'g' },
      { name: 'olive oil', quantity: 1, unit: 'tbsp' },
    ],
  },
  now
);

describe('scaleRecipe (PR-005)', () => {
  it('doubles quantities when servings double', () => {
    const scaled = scaleRecipe(base, 4);
    expect(scaled.servings).toBe(4);
    expect(scaled.ingredients[0].quantity).toBe(400);
    expect(scaled.ingredients[1].quantity).toBe(2);
  });

  it('halves quantities when servings halve', () => {
    const scaled = scaleRecipe(base, 1);
    expect(scaled.ingredients[0].quantity).toBe(100);
  });

  it('returns the recipe unchanged for non-positive servings', () => {
    expect(scaleRecipe(base, 0)).toEqual(base);
  });
});
