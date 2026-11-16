import { hasWordMatch, textWords } from '../../common/utils/text-search.util';

export type SearchableRecipe = {
  id: string;
  title: string;
  ingredients: { name: string; genericFoodId: string | null }[];
};

export type SearchTerm = {
  word: string;
  genericFoodIds: string[];
};

export function matchesTitleOrIngredients(
  recipe: SearchableRecipe,
  terms: SearchTerm[],
): boolean {
  return terms.every(
    ({ word, genericFoodIds }) =>
      hasWordMatch(recipe.title, word) ||
      recipe.ingredients.some(
        (ingredient) =>
          hasWordMatch(ingredient.name, word) ||
          (ingredient.genericFoodId !== null &&
            genericFoodIds.includes(ingredient.genericFoodId)),
      ),
  );
}

export function rankRecipes(
  recipes: SearchableRecipe[],
  words: string[],
): SearchableRecipe[] {
  const scored = recipes.map((recipe) => ({
    recipe,
    titleHits: words.filter((word) => hasWordMatch(recipe.title, word)).length,
    titleWords: textWords(recipe.title).length,
  }));
  scored.sort(
    (a, b) => b.titleHits - a.titleHits || a.titleWords - b.titleWords,
  );
  return scored.map(({ recipe }) => recipe);
}
