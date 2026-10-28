import {
  matchesTitle,
  matchesTitleOrIngredients,
  rankRecipes,
} from './recipe-search';

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

  describe('rankRecipes', () => {
    const titled = (id: string, title: string) => ({
      id,
      title,
      ingredients: [],
    });
    const ids = (recipes: { id: string }[]) => recipes.map((r) => r.id);

    it('puts more title words first, so title matches beat ingredient-only ones', () => {
      expect(
        ids(
          rankRecipes(
            [
              titled('ingredients-only', 'Shakshuka'),
              titled('one-word', 'Tomato soup'),
              titled('both-words', 'Tomato and egg stir fry'),
            ],
            ['tomato', 'egg'],
          ),
        ),
      ).toEqual(['both-words', 'one-word', 'ingredients-only']);
    });

    it('then exact words, then shorter titles', () => {
      expect(
        ids(
          rankRecipes(
            [
              titled('plural', 'Mini pies'),
              titled('long', 'Three fish pie with prawns'),
              titled('short', 'Fish pie'),
            ],
            ['pie'],
          ),
        ),
      ).toEqual(['short', 'long', 'plural']);
    });

    it('keeps the input order for ties', () => {
      expect(
        ids(
          rankRecipes(
            [titled('newer', 'Fish pie'), titled('older', 'Meat pie')],
            ['pie'],
          ),
        ),
      ).toEqual(['newer', 'older']);
    });
  });
});
