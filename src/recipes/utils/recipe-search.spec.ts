import { matchesTitleOrIngredients, rankRecipes } from './recipe-search';

describe('recipe search matching', () => {
  const recipe = {
    id: 'r1',
    title: 'Braised Beef Chilli',
    ingredients: [
      { name: 'Chopped tomatoes', genericFoodId: 'tomato-food' },
      { name: 'Red onions', genericFoodId: null },
    ],
  };

  it('applies the word rule to ingredients too: "on" is not a word of "Red onions"', () => {
    expect(
      matchesTitleOrIngredients(
        recipe,
        ['on', 'beef'],
        [new Set<string>(), new Set<string>()],
      ),
    ).toBe(false);
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
