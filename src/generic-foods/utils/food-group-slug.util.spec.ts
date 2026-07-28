import { toFoodGroupSlug } from './food-group-slug.util';

describe('toFoodGroupSlug', () => {
  it('lowercases a single word', () => {
    expect(toFoodGroupSlug('Vegetables')).toBe('vegetables');
  });

  it('kebab-cases spaces and conjunctions', () => {
    expect(toFoodGroupSlug('Milk and milk products')).toBe(
      'milk-and-milk-products',
    );
  });

  it('replaces slashes and other punctuation', () => {
    expect(toFoodGroupSlug('Fish/crustacean/shellfish')).toBe(
      'fish-crustacean-shellfish',
    );
  });

  it('collapses repeated separators and trims edges', () => {
    expect(toFoodGroupSlug('  Potatoes and tubers  ')).toBe(
      'potatoes-and-tubers',
    );
    expect(toFoodGroupSlug('Sugar/sweets/sweet sauces')).toBe(
      'sugar-sweets-sweet-sauces',
    );
  });
});
