import { matchesTitle, matchesTitleOrIngredients } from './recipe-search';

describe('recipe search matching', () => {
  const recipe = {
    id: 'r1',
    title: 'Braised Beef Chilli',
    ingredients: [
      { name: 'Chopped tomatoes', genericFoodId: 'tomato-food' },
      { name: 'Red onions', genericFoodId: null },
    ],
  };

  it('matches titles by whole words, in any order', () => {
    expect(matchesTitle(recipe, ['chilli', 'beef'])).toBe(true);
    expect(matchesTitle(recipe, ['chil'])).toBe(true);
    expect(matchesTitle(recipe, ['raise'])).toBe(false);
    expect(matchesTitle(recipe, ['beef', 'tomato'])).toBe(false);
  });

  it('lets each word match the title or any ingredient', () => {
    const noTranslations = [new Set<string>(), new Set<string>()];
    expect(
      matchesTitleOrIngredients(recipe, ['beef', 'tomato'], noTranslations),
    ).toBe(true);
    expect(
      matchesTitleOrIngredients(recipe, ['onion', 'tomato'], noTranslations),
    ).toBe(true);
    // Same word rule as titles: "on" is not a word of "Red onions".
    expect(
      matchesTitleOrIngredients(recipe, ['on', 'beef'], noTranslations),
    ).toBe(false);
  });

  it("matches an ingredient through its generic food's translation", () => {
    expect(
      matchesTitleOrIngredients(
        recipe,
        ['pomodoro', 'beef'],
        [new Set(['tomato-food']), new Set()],
      ),
    ).toBe(true);
  });
});
