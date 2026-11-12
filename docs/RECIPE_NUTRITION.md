# MealDB recipe nutrition

MealDB recipes do not ship with nutrition. Totals are calculated from the linked NEVO food and the parsed amount, then stored on `Recipe.nutritionalInfo`. `sustainabilityScore` is not part of this calculation and is left as it was.

The old values in `prisma/seeds/data/themealdb-data.json` were baked in before ingredients were remapped to NEVO. The seed no longer copies them. `npm run db:backfill:recipe-nutrition` rewrites MealDB rows. User recipes are not touched.

## Amount

Use `quantity` and `unit` when both are set. Otherwise parse `measure` with `parseQuantityUnit`. Do not use `parseMeasure`: that helper still turns an unknown measure into 100 g, and it treats every cup as 150 g.

`quantityToGrams` then converts the catalog unit:

| Unit | Grams |
| --- | --- |
| `G` | the quantity |
| `KG` | quantity × 1000 |
| `ML` / `L` | millilitres × grams per ml |
| `CUPS` | quantity × 240 ml × grams per ml. MealDB cups are already stored as `ML` (240 ml per cup). |
| `PIECES` | see below |

Grams per ml come from the food name. Flour is 0.53, oil 0.91, sugar 0.85, butter 0.96, rice 0.85. A known liquid (milk, stock, juice, sauce, and the rest of that list) is 1. Anything else is also 1, which is the water assumption and is wrong for an unlisted powder. Longer names win, so peanut butter is not treated as butter.

A piece count uses a count word in the original measure when there is one (`can` 400 g, `clove` 3 g, `slice` 30 g). The unit column only stores `PIECES`, so the word has to be read back from `measure`. Otherwise the food's average piece weight is used (an egg is 50 g, an onion 150 g), including `small` / `medium` / `large` (× 0.7 / 1 / 1.3). Black pepper is not the vegetable pepper row. A piece with no count word and no table row is unknown. It is not given 100 g.

## Three buckets

Each ingredient is one of:

- **Measured.** The amount converted to grams above, and a linked `GenericFood` or `FoodProduct`. Nutrients are `per 100 g × grams / 100`. A product link wins over a generic food when both are set.
- **Estimated.** The measure did not parse, and the name is a condiment: salt, pepper, dried spices, herbs, extracts, baking powder, yeast, vinegar, fish sauce, stock cube, oil, water. Plain water is 0 g. An unparsed oil is a 5 g drizzle. Fresh herbs (parsley, basil, mint, and the rest of that list) are 2 g. Everything else in this list is 1 g. A linked food is scaled by those grams. An unmapped condiment adds nothing, and its name is still recorded. The same zero applies when the condiment did parse but has no link and weighs 15 g or less. Water chestnut and a whole green or red pepper are not condiments.
- **Unknown.** Anything else we cannot weigh: no amount on a non-condiment, a piece with no weight, or a measured amount of a non-condiment with no linked food. A condiment with no link and at most 15 g (a tablespoon of spice, extract, or sauce) adds nothing and is listed in `missingIngredients`. More than that, with no link, withholds the total. One unknown ingredient drops the whole recipe.

## When nothing is stored

`nutritionalInfo` is null when there is an unknown ingredient, or when estimated energy is more than 10% of recipe energy. A partial sum of the parsed lines is not written. A recipe whose only gaps are salt and pepper still gets a total, because those guesses are about a gram. A recipe that is mostly "a drizzle of oil" does not.

Confidence is the energy-weighted quality of the measured rows (weight 1, volume 0.7, piece count 0.4) divided by total energy. Estimated energy is in the denominator only, so a guess lowers confidence and does not count as measured. It is metadata, not a grade. `missingIngredients` lists the estimated names.

Published fields are energy (kcal and kJ), protein, fat, saturated fat, carbohydrates, sugars, fiber, sodium, and the vitamins and minerals on the linked food. `perServing` is the same fields divided by `servings`. Most MealDB recipes are stored as 4 servings because that is the dataset default.

## Running it

After the ingredient-unit backfill:

```bash
npm run db:backfill:recipe-nutrition -- --dry-run
npm run db:backfill:recipe-nutrition
```

Both seed flows run the unit backfill and then this one. Re-running is safe: a row is written only when the JSON changes.
