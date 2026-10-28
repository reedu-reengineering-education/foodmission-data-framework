import { hasWordMatch } from '../../common/utils/text-search.util';

/** What a recipe search looks at. */
export type SearchableRecipe = {
  id: string;
  title: string;
  ingredients: { name: string; genericFoodId: string | null }[];
};

/** Every search word appears in the title (see hasWordMatch). */
export function matchesTitle(
  recipe: SearchableRecipe,
  words: string[],
): boolean {
  return words.every((word) => hasWordMatch(recipe.title, word));
}

/**
 * Every search word appears in the title or in an ingredient: in its name, or
 * as its generic food's translated name (`translatedFoodIds[i]` holds the
 * foods matching word i). Same word rule for all of them.
 */
export function matchesTitleOrIngredients(
  recipe: SearchableRecipe,
  words: string[],
  translatedFoodIds: ReadonlySet<string>[],
): boolean {
  return words.every(
    (word, i) =>
      hasWordMatch(recipe.title, word) ||
      recipe.ingredients.some(
        (ingredient) =>
          hasWordMatch(ingredient.name, word) ||
          (ingredient.genericFoodId !== null &&
            translatedFoodIds[i].has(ingredient.genericFoodId)),
      ),
  );
}
