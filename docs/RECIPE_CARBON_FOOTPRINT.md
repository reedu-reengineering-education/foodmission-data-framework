# Recipe carbon footprint

Recipes carry `carbonFootprint`: kg CO2 eq per kg of the finished dish. The value comes from AGRIBALYSE v3.2 (ADEME) figures for the generic foods linked to the recipe's ingredients. It is a plain average of published data, not a score or rating. It is `null` when it can't be calculated reliably.

## Formula

```
carbonFootprint = Σ (ingredient grams × food kg CO2 eq per kg) / dish grams
```

The result is rounded to two decimals.

Example: 500 g beef (28.9) and 100 g onion (0.421).

```
(500 × 28.9 + 100 × 0.421) / 600 = 24.15 kg CO2 eq per kg
```

## How ingredients are weighed

The weighing is shared with the nutrition estimate (`weighIngredients` in `src/recipes/nutrition/calculate-recipe-nutrition.ts`), so both estimates describe the same dish.

- **Measured amounts:** `quantity` and `unit` are converted to grams.
- **Amounts without a measure:** a phrase gives a small fixed weight, for example "pinch" 0.5 g, "for greasing" 10 g, "splash" 15 g. Condiments such as salt count as 1 g. Foods with at most 50 kcal per 100 g count as 30 g.
- **Served alongside:** "to serve" counts as 0 g and is left out.
- **Dish weight:** the sum of all ingredient weights, plus the water that dry staples absorb while cooking. Cooking liquid already in the recipe (water, stock, milk, wine, tinned tomatoes, …) is subtracted from the absorbed water first.

| Dry staple | Water absorbed per gram |
|---|---|
| Pasta | 1.3 g |
| Rice | 1.8 g |
| Couscous, lentils | 1.5 g |
| Bulgur, quinoa | 1.7 g |

Example: 100 g dry pasta (1.98) with no liquid in the recipe absorbs 130 g of water.

```
(100 × 1.98) / 230 = 0.86 kg CO2 eq per kg
```

## When the value is `null`

- A linked generic food has no footprint. 28 of the 402 foods used in recipes have no AGRIBALYSE equivalent, for example mushrooms, yeast and oyster sauce.
- An ingredient is linked only to a food product. Products have no footprint data yet.
- An ingredient without a linked food weighs more than 15 g.
- An ingredient can't be weighed: it has no measured amount and none of the fallback weights apply.
- The recipe has no ingredients, or nothing with a footprint is counted.

Ingredients without a linked food up to 15 g (spices, baking powder) don't block the calculation. They add to the dish weight but contribute no CO2.

## When it is calculated

- **Create and update:** whenever the request contains `ingredients` (`RecipesService.withEstimates`). An update that doesn't touch the ingredients keeps the stored value.
- **Seed:** `npm run db:seed` first copies the footprints onto the generic foods, then recalculates every recipe, including user recipes (`applyCarbonFootprints` and `recalculateEstimates` in `scripts/seeds/prod/themealdb.ts`).

Clients can't send `carbonFootprint`; it is always calculated.

## Data

`prisma/seeds/data/nevo-agribalyse-mapping.json` maps NEVO foods to AGRIBALYSE products:

```json
{ "nevoCode": 830, "agribalyseCode": "11000", "co2PerKg": 0.383 }
```

- `nevoCode`: the generic food (`GenericFood.nevoCode`).
- `agribalyseCode`: the AGRIBALYSE product (`Code_AGB`), kept so a value can be traced and refreshed.
- `co2PerKg`: the AGRIBALYSE "Changement climatique" indicator, in kg CO2 eq per kg of product. It is stored in `GenericFood.carbonFootprint`.

Source: [AGRIBALYSE v3.2 "Synthèse"](https://data.ademe.fr/datasets/agribalyse-31-synthese), ADEME, Licence Ouverte / Open Licence 2.0. The values describe products as sold in France.

AGRIBALYSE has no NEVO codes, so the foods were matched by name. Where no exact product exists, the closest one is used (for example raisins for dried currants). Dried products are left out when only the fresh product exists, because the fresh value would understate them.

### Changing the mapping

1. Find the product in the AGRIBALYSE dataset and note its `Code_AGB` and "Changement climatique" value.
2. Add or edit the row in `nevo-agribalyse-mapping.json`. Removing a row clears that food's footprint on the next seed.
3. Run `npm run db:seed`. It logs how many foods have a footprint and how many recipes got a value.
4. Run `npx jest test/scripts/seeds/nevo-agribalyse-mapping.spec.ts`. It checks that every `nevoCode` exists in NEVO, appears once, and has a positive value.

## Limits

- Food waste is not included.
- The footprint of a recipe changes only when its ingredients are saved again or the seed runs.
- Amounts guessed from phrases are small. In the seeded recipes they account for at most about 11% of a recipe's CO2.
