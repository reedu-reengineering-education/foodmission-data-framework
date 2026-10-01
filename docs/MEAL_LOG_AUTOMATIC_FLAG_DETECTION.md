# Meal log: automatic flag detection

`POST /meal-logs` accepts diet flags (`flags`, values of `MEAL_FLAG_EVENT_TYPES`). Each flag becomes a `MEAL_*` event that mission rules count.

When a log has a `mealId`, the server also derives flags from the meal's items: NEVO foods (`GenericFood`) and OpenFoodFacts products (`FoodProduct`). Clients don't have to send flags the food data already shows. Logs without a `mealId` have no items, so their flags remain manual.

## Flags set automatically

| Flag | Rule | NEVO item | OFF item |
|---|---|---|---|
| `MEAL_MEAT_CONSUMED` | any item | `meatOrFish = true` | a meat, fish or seafood category: `en:meats`, `en:meats-and-their-products`, `en:prepared-meats`, `en:poultry`, `en:sausages`, `en:hams`, `en:fishes`, `en:seafood`, `en:crustaceans`, `en:meals-with-meat` / `-chicken` / `-fish`, `en:poultry-meals` |
| `MEAL_MEAT_FREE` | every item, and no item is meat | `vegetarian = true` | vegetarian per `ingredients_analysis_tags` (`en:vegetarian`) or the `en:vegetarian` label. Uses the stored `isVegetarian` if the tags don't say. Unknown or "maybe" blocks the flag. |
| `MEAL_VEGAN` | every item, and no item is meat | `vegan = true` | the same with `en:vegan` / `isVegan`. Unknown or "maybe" blocks the flag. |
| `MEAL_LEGUME_CONSUMED` | any item | `legume = true` | a legume category: `en:legumes`, `en:pulses`, `en:beans`, `en:lentils`, `en:chickpeas`, `en:peas`, `en:green-beans`, `en:broad-beans`, `en:peanuts`, `en:peanut-butters`, `en:tofu`, `en:tempeh`, `en:hummus`, `en:falafels`, … Soy drinks, desserts, yoghurts and sauce don't count. |
| `MEAL_ANCIENT_GRAIN` | any item | a fixed list of NEVO codes: quinoa (3153, 3154), millet (847, 2159), buckwheat (208, 1019), spelt (5576, 5577, 5582) | `en:quinoa`, `en:spelt`, `en:buckwheat`, `en:millet`, `en:amaranth`, `en:teff`, `en:sorghum` (plus flour and groat variants) |
| `MEAL_CERTIFIED_PRODUCT` | any item | — (NEVO has no label data) | a certification label (see below) |

### Certification labels

OFF label tags vary by certifier and country, so labels are matched by pattern on the tag name, with the language prefix removed:

- **Organic:** `organic`, `*-organic`, EU control-body codes (`fr-bio-01`, `de-oko-007`, `pl-eko-01`, …), `ab-agriculture-biologique`, `demeter`, `naturland`, `bioland`
- **Fair trade:** `fair-trade*`, `fairtrade*`, `naturland-fair`, `rainforest-alliance*`, `utz-certified`
- **Seafood:** `sustainable-seafood-msc`, `msc-c-*`, `responsible-aquaculture-asc`
- **Geographical indications:** `pdo`, `pgi`, `tsg`, and named ones such as `pdo-arroz-de-valencia`

These don't count:
- packaging labels: `en:fsc`, `en:green-dot`, `fr:triman`
- vague claims: `en:sustainable`
- diet labels: `en:vegan`, `en:no-gluten`, …

## Definitions

NEVO and OFF use the same definitions, so a meal gets the same flags whichever source its items come from.

- **Meat** means meat, poultry, fish or seafood is actually in the food, and fish counts as meat. Derivatives such as gelatin, lard, stock, gravy, oyster sauce and shrimp paste make a food non-vegetarian but don't make the meal a meat meal. For OFF items, meat is decided by category, not by the non-vegetarian tag, because OFF also tags gelatin sweets as non-vegetarian.
- **Vegetarian** means no meat or fish and none of those derivatives.
- **Vegan** means vegetarian and no dairy, egg or honey.
- **Legume** covers:
  - pulses (beans, lentils, chickpeas, dried and split peas)
  - peas (fresh, frozen, tinned and mange-tout)
  - green and broad beans
  - peanuts, peanut butter and peanut sauces
  - soy and pulse foods (tofu, tempeh, hummus, falafel, soy- or pea-based burgers and mince)
  - dishes built on pulses (chili, dahl, pea soup)

  It doesn't cover oils, soy drinks, soy sauce, miso, bean sprouts, or foods where peanuts are a minor ingredient (sweets, biscuits).
- **Unknown:** an item with no linked food, or an OFF item whose diet status is unknown, counts as unknown. That blocks meat-free and vegan.

The NEVO flags are stored on `GenericFood` (`vegan`, `vegetarian`, `meatOrFish`, `legume`) and seeded from `prisma/seeds/data/nevo/nevo_diet_flags.csv`. They were set for all 2328 NEVO foods from three sources:
- the food group
- NEVO's nutrient data: haem iron for meat and fish, animal protein and cholesterol for vegan
- a manual review of mixed dishes and borderline products

## Merging with client flags

The client wins:
- A derived flag that contradicts a client flag is dropped. Derived `MEAL_MEAT_CONSUMED` is dropped against client `MEAL_MEAT_FREE` or `MEAL_VEGAN`, and the reverse.
- Contradictions within the client's own flags are still rejected with `400`.

The merged flags are stored on the meal log (`MealLog.flags`), and each one is recorded once as an event. `MEAL_VEGAN` still also records `MEAL_MEAT_FREE`.

Each flag event's metadata has a `flagSource`:

| `flagSource` | Meaning |
|---|---|
| `user` | sent by the client only |
| `derived` | derived from the meal items only |
| `both` | sent by the client and also derived |

## Where the OFF data comes from

Products imported via `POST /food-products/import/openfoodfacts/:barcode` are stored with only name, barcode and diet flags. Their categories, labels and ingredient-analysis tags are empty in Postgres.

At log time, those three tag lists are therefore read from the OFF Mongo copy (`MONGODB_OFF_URL`). It's a single query for all of the meal's barcodes, projected to `categories_tags`, `labels_tags` and `ingredients_analysis_tags`.

Fallback: if Mongo isn't configured, takes longer than 2 seconds, fails, or has no document for a barcode, the fields stored on `FoodProduct` are used. The live OFF HTTP API is never called at log time.

Detection never blocks a meal log. If loading the items or querying Mongo fails, the error is logged and the log is created with the client's flags only.

## Not derived

| Flag | Why |
|---|---|
| `MEAL_LOCAL_PRODUCE` | OFF origin data is free text and patchy, and where a product is made isn't where its food comes from |
| `MEAL_SEASONAL_PRODUCE` | neither NEVO nor OFF has seasonal data |
| `MEAL_ALTERNATIVE_STAPLE` | not defined yet |
| `MEAL_SUSTAINABLE_PLATE` | not defined yet |

## Code

| File | What it holds |
|---|---|
| `src/meal-logs/derive-meal-flags.ts` | `itemFacts`, `deriveMealFlags`, `mergeDerivedFlags`, `ANCIENT_GRAIN_NEVO_CODES` |
| `src/food-products/utils/off-meal-facts.ts` | OFF category lists (`offCategoryFacts`) and certification patterns (`isCertifiedLabel`) |
| `src/food-products/utils/off-diet-flags.ts` | `parseOffDietFlags`: vegan and vegetarian from OFF tags |
| `src/food-products/repositories/off-mongo-product.repository.ts` | `findMealFactsByBarcodes`: the Mongo lookup for several barcodes at once |
| `src/meal-logs/services/meal-logs.service.ts` | `create` → `deriveFlagsForMeal` → `mergeDerivedFlags` → `recordFlagEvents` |

## Testing it by hand

1. Create a meal: `POST /api/v1/meals` with `{ "name": "Quinoa bean bowl" }`.
2. Add items with `POST /api/v1/meals/{mealId}/meal-items`, one call each:
   - NEVO quinoa cooked (3154): `{ "genericFoodId": "<id>", "quantity": 150, "unit": "G" }`
   - NEVO lentils red boiled (5174): `{ "genericFoodId": "<id>", "quantity": 100, "unit": "G" }`
   - OFF "Haricots blancs a la tomate" (barcode `3560071015367`, organic): `{ "foodProductId": "<id>", "quantity": 200, "unit": "G" }`
3. Log it: `POST /api/v1/meal-logs` with `{ "mealId": "<mealId>", "typeOfMeal": "LUNCH" }`.

Expected result:
- The log's flags are `MEAL_MEAT_FREE`, `MEAL_VEGAN`, `MEAL_LEGUME_CONSUMED`, `MEAL_ANCIENT_GRAIN` and `MEAL_CERTIFIED_PRODUCT`.
- `user_events` has those events with `flagSource: "derived"`.

Look up the IDs with `GET /api/v1/generic-foods?search=quinoa` and `GET /api/v1/food-products?barcode=3560071015367`.

To check meat: add a NEVO chicken item. The log then gets `MEAL_MEAT_CONSUMED` instead of meat-free and vegan.

The dev meal-log seeds (`db:seed:meal-logs`, `scripts/dev/seed-personal-data.ts`) write logs straight to the database, bypassing `MealLogsService`. Seeded logs therefore have no derived flags or events.
