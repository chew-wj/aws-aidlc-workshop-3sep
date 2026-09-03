import { parseRecipeInput, ValidationError } from './validation';

describe('parseRecipeInput (PR-007)', () => {
  const valid = {
    name: 'Pasta',
    servings: 2,
    ingredients: [{ name: 'penne', quantity: 200, unit: 'g' }],
  };

  it('accepts and normalizes a valid recipe', () => {
    const r = parseRecipeInput({ ...valid, name: '  Pasta  ' });
    expect(r.name).toBe('Pasta');
    expect(r.ingredients).toHaveLength(1);
  });

  it('rejects missing name', () => {
    expect(() => parseRecipeInput({ ...valid, name: '' })).toThrow(
      ValidationError
    );
  });

  it('rejects servings < 1', () => {
    expect(() => parseRecipeInput({ ...valid, servings: 0 })).toThrow(
      ValidationError
    );
  });

  it('rejects empty ingredients', () => {
    expect(() => parseRecipeInput({ ...valid, ingredients: [] })).toThrow(
      ValidationError
    );
  });

  it('rejects disallowed units', () => {
    expect(() =>
      parseRecipeInput({
        ...valid,
        ingredients: [{ name: 'x', quantity: 1, unit: 'gallon' }],
      })
    ).toThrow(ValidationError);
  });

  it('rejects non-object body', () => {
    expect(() => parseRecipeInput('nope')).toThrow(ValidationError);
  });
});
