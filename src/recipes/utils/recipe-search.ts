import {
  hasExactWordMatch,
  hasWordMatch,
  textWords,
} from '../../common/utils/text-search.util';

export type SearchableRecipe = {
  id: string;
  title: string;
  ingredients: { name: string; genericFoodId: string | null }[];
};

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

export function rankRecipes<T extends SearchableRecipe>(
  recipes: T[],
  words: string[],
): T[] {
  const scored = recipes.map((recipe) => ({
    recipe,
    titleHits: words.filter((word) => hasWordMatch(recipe.title, word)).length,
    exactHits: words.filter((word) => hasExactWordMatch(recipe.title, word))
      .length,
    titleWords: textWords(recipe.title).length,
  }));
  scored.sort(
    (a, b) =>
      b.titleHits - a.titleHits ||
      b.exactHits - a.exactHits ||
      a.titleWords - b.titleWords,
  );
  return scored.map(({ recipe }) => recipe);
}
