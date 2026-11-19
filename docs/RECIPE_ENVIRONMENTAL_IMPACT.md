# Recipe environmental impact

Recipes carry `environmentalImpact`: the climate impact and the overall environmental impact of the dish, calculated from AGRIBALYSE 3.2 (ADEME) values of the foods linked to its ingredients.

```json
{
  "perKg": { "co2": 2.416, "efScoreMpt": 0.301 },
  "coverage": 1,
  "dqr": 2.92,
  "source": "AGRIBALYSE 3.2"
}
```

| Field | Meaning |
|---|---|
| `co2` | Climate change, kg CO2 eq |
| `efScoreMpt` | EF single score in millipoints: AGRIBALYSE's aggregate of 16 impact categories (climate, water, land use, particles, …), recommended by the European Commission. Lower is better; the absolute number only makes sense compared with other foods. |
| `perKg` | Per kg of the finished dish |
| `coverage` | Share of the ingredient weight that has AGRIBALYSE data (0–1) |
| `dqr` | Data quality ratio, weighted by ingredient weight: 1 very good to 5 very poor. The European Commission advises caution above 3. |

It is not a grade. No A–E letter is derived from it (the Green-Score needs a licence and is defined for France and Belgium only).

## Data

- **AGRIBALYSE table:** `prisma/seeds/data/agribalyse/agribalyse-3.2-synthese.csv`, downloaded from the [ADEME dataset](https://data.ademe.fr/datasets/agribalyse-31-synthese) (Licence Ouverte / Open Licence 2.0). It is imported into `agribalyse_foods` with one row per AGRIBALYSE code: names, food group, preparation at home, DQR, `efScorePerKg` (mPt per kg) and `co2PerKg` (kg CO2 eq per kg).
- **Generic foods:** `prisma/seeds/data/agribalyse/nevo-agribalyse-mapping.json` links NEVO foods to AGRIBALYSE codes (`GenericFood.agribalyseCode`). AGRIBALYSE has no NEVO codes, so the links were matched by name: the 374 foods used in seeded recipes by hand, the rest with scripted candidate searches and a decision per food, checked for valid codes, duplicates and cross-species meat matches. `match` is `high` for the same product and `medium` for the closest available one (for example raisins for dried currants). Dried products are not linked when only the fresh product exists.
- **Open Food Facts products:** `FoodProduct.agribalyseCode` is the code OFF assigns from the product's category (`environmental_score_data.agribalyse.code`, or `ecoscore_data` in older data). It is set when a product is imported and can be filled for existing products with `npm run db:link:agribalyse-products`. A code that is not in our AGRIBALYSE table is ignored.

An ingredient uses its product's AGRIBALYSE value first, then its generic food's.

## Calculation

The ingredients are weighed by the same code as the nutrition estimate (`weighIngredients` in `src/recipes/nutrition/calculate-recipe-nutrition.ts`):

- measured amounts are converted to grams; pieces use edible weights (a banana counts 80 g, a chicken leg 140 g);
- amounts that can't be converted to grams get a small fixed weight ("pinch" 0.5 g, "splash" 15 g, condiments 1 g, low-energy foods 30 g, "to serve" 0 g).

Then:

```
co2 total        = Σ (ingredient grams × co2PerKg) / 1000
co2 per kg       = co2 total / cooked dish kg
```

The EF score is calculated the same way. The cooked dish weight is the sum of the ingredient weights, with:

- raw meat and poultry counted at 75% and raw fish and shellfish at 80% of their weight (water lost in cooking);
- water absorbed by dry pasta (1.3 g per g), rice (1.8), couscous and lentils (1.5), bulgur and quinoa (1.7), minus the cooking liquid already in the recipe.

### When it is `null`

- An ingredient can't be weighed.
- Less than 95% of the ingredient weight has AGRIBALYSE data. Up to 5% may be missing, so a pinch of an unmapped spice doesn't block a recipe; the missing part adds no impact and shows in `coverage`.
- The recipe has no ingredients.

A high `dqr` does not withhold the value; it is reported so clients can flag it.

## When it is calculated

- **Create and update** (`RecipesService.withEstimates`): when the request contains `ingredients`.
- **Seed** (`npm run db:seed`): every recipe, including user recipes, after AGRIBALYSE and the links are loaded (`recalculateRecipeEstimates` in `scripts/seeds/prod/recipe-estimates.ts`).
- **Product backfill** (`npm run db:link:agribalyse-products`): every recipe again when a product's code changed.

Clients can't send `environmentalImpact`.

## How it compares with AGRIBALYSE's own dishes

`npm run db:compare:recipe-impact` compares seeded recipes with the matching AGRIBALYSE dishes. With the seeded data our CO2 per kg is 0.37–1.88 times AGRIBALYSE's value (pancakes 0.97, chicken couscous 0.77, lasagne 1.44, ratatouille 0.47). The spread has two reasons:

- AGRIBALYSE's dishes are industrial ready meals, including processing, packaging, chilled distribution and reheating. A home recipe made from raw ingredients has none of these.
- The recipes differ (AGRIBALYSE's moussaka is lamb-heavy, our hummus uses more tahini).

## Limits

- **No cooking energy.** Most raw products in AGRIBALYSE ("Préparation: pas de préparation") include no cooking, and the method of a recipe is unknown. Cooked dishes, especially vegetable dishes, are underestimated.
- **No food waste**, and no transport from the shop.
- **Measured weights are taken as given.** "Chicken legs 460 g" may include bone; only piece weights are edible weights.
- **Vegetables are not reduced for cooking loss**, and liquid boiled off in stews is not subtracted, because the cooking method is unknown.
- **French data.** AGRIBALYSE describes products sold in France; production in other countries can differ.
- **Coverage of NEVO foods.** 2007 of the 2328 NEVO foods are linked. The other 321 have no reasonable AGRIBALYSE equivalent: for example cultivated mushrooms, yeast, gravies, pickles, eel, horse and game, Dutch and Surinamese composite dishes, sports and protein products. Most links are `medium`, because AGRIBALYSE describes French products (Dutch breads, cheeses and sauces map to their closest French counterpart).

## Changing the data

- **New AGRIBALYSE version:** download the Synthèse with the same columns to `prisma/seeds/data/agribalyse/`, update `VERSION` in `scripts/seeds/prod/agribalyse.ts`, and run `npm run db:seed`.
- **Mapping a NEVO food:** add `{ "nevoCode", "agribalyseCode", "match" }` to `nevo-agribalyse-mapping.json`, run `npx jest test/scripts/seeds/agribalyse.spec.ts` (checks that both codes exist) and `npm run db:seed`.
