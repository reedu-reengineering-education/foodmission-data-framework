import {
  hasExactWordMatch,
  hasWordMatch,
  textWords,
} from '../../common/utils/text-search.util';

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

/**
 * Best match first: more search words in the title (so title matches come
 * before ingredient-only ones), more of them as the exact word, then the
 * shorter title. Ties keep the input order (newest first).
 */
export function rankRecipes<T extends SearchableRecipe>(
  recipes: T[],
  words: string[],
): T[] {
  const keyed = recipes.map((recipe) => ({
    recipe,
    key: [
      -words.filter((word) => hasWordMatch(recipe.title, word)).length,
      -words.filter((word) => hasExactWordMatch(recipe.title, word)).length,
      textWords(recipe.title).length,
    ],
  }));
  keyed.sort((a, b) => {
    const i = a.key.findIndex((value, index) => value !== b.key[index]);
    return i === -1 ? 0 : a.key[i] - b.key[i];
  });
  return keyed.map(({ recipe }) => recipe);
}
