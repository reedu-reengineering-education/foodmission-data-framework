# FoodEx2 food vocabulary

The user-facing food search runs on **FoodEx2**, EFSA's food classification.
**NEVO** remains the only source of nutritional values.

```text
user query
    ↓
FoodEx2 food name          foodex2_terms
    ↓ canonical mapping    foodex2_nevo_mappings (isCanonical)
NEVO generic food          generic_foods
    ↓
nutritional values
```

Searching `pasta` returns the concept **Dried pasta**, not the five NEVO pasta
variants behind it. `GET /generic-foods` still lists the raw NEVO catalogue
unchanged, for admin use and backwards compatibility.

## Endpoints

| Endpoint                                 | Purpose                                      |
| ---------------------------------------- | -------------------------------------------- |
| `GET /generic-foods/search?search=pasta` | Primary user-facing food search (FoodEx2)    |
| `GET /generic-foods/foodex2/:code`       | One FoodEx2 food and its canonical nutrients |
| `GET /generic-foods`                     | Raw NEVO catalogue (unchanged)               |

### Switching a client over

`GET /generic-foods/search` returns a **superset of the generic-food response**,
so a client can move off `GET /generic-foods` without changing how it reads a
result. Two guarantees make that safe:

- **`id` is the canonical GenericFood id**, not the FoodEx2 term id. It stays
  valid as `genericFoodId` when creating pantry or shopping items. The term id
  is exposed separately as `foodex2Id`. Returning the term id here would break
  the foreign key on every add-to-pantry call, which is why an e2e test asserts
  `id !== foodex2Id` and that `id` resolves to a real `generic_foods` row.
- **`foodName` is the FoodEx2 name** (localized when `lang` is set), so the UI
  renders "Kartoffeln und ähnliche" unchanged. The NEVO name moves to
  `source.foodName`.

Everything else the old endpoint returned is still there and still flat —
`nevoCode`, `foodGroup`, `foodGroupSlug`, the diet flags
(`vegan`/`vegetarian`/`meatOrFish`/`legume`) and all nutrient columns.
Pagination (`items`/`total`/`page`/`limit`/`totalPages`) is identical. The
additive fields are `foodex2Code`, `foodex2Id`, `nameEn`, `shortName`,
`isCore`, `parentCode`, `variantCount` and `source`.

One caveat: `id` is **not stable across canonical re-selection**. Retuning
`foodex2-canonical.config.ts` can elect a different NEVO record and change a
concept's `id`. Persisted pantry rows are unaffected (they hold a real
GenericFood foreign key that stays valid), but a client caching "this food's
identity" should key on `foodex2Code`, not `id`.

## Why a hierarchy walk is needed

NEVO publishes a FoodEx2 code per food, but **most of those codes are extended
terms, not core-list terms** — 447 of the 866 distinct codes in NEVO 2025 9.0.
A plain `foodex2_code` equality join would therefore miss the majority of the
dataset. The importer walks the MTX master hierarchy upward instead:

```text
NEVO 4 "Pasta white raw"
  → A007P "Dried durum pasta"   (extended)
  → A007L "Dried pasta"         (core, exposed to users)
```

Terms that have no core ancestor fall back to EFSA's `M`/`P` groupings
("Dried herbs", "Smoked fish"); without that, ~64 concepts would be unreachable.

## Canonical selection

A FoodEx2 concept maps to many NEVO records, so one is elected as canonical.
Values are **never averaged** — dry and cooked pasta differ mostly in water
content, so a mean would be misleading.

All rules live in
[`src/generic-foods/foodex2/foodex2-canonical.config.ts`](../src/generic-foods/foodex2/foodex2-canonical.config.ts)
as data, not logic. The default prefers **raw / as-bought** variants, because
`GenericFood` is consumed by pantry items, shopping-list items, recipe
ingredients and food waste — all ingredient-shaped. Change
`preparationRules` if the product becomes as-consumed oriented.

Scoring, in order of weight: preparation state → NEVO's own generic averages
(`av`) → penalties for fortified and compound variants → hierarchy distance →
name length. Ties break on the lowest NEVO code, so the outcome is
deterministic. The score and a human-readable `selectionReason` are stored on
every mapping row.

A partial unique index enforces **zero or one canonical NEVO record per FoodEx2
food**; a second one is rejected by the database.

## Updating the dataset

The catalogue itself is not committed — it is a 3.8 MB `.ecf` that unpacks to
88 MB of XML. Only the distilled CSV is in the repository.

```bash
# 1. download a release from https://github.com/openefsa/efsa-catalogues/releases
curl -L -o MTX_FULL_12_0.ecf \
  https://github.com/openefsa/efsa-catalogues/releases/download/12.0/MTX_FULL_12_0.ecf

# 2. distil it into prisma/seeds/data/foodex2/foodex2-mtx-<version>.csv
npm run foodex2:extract -- MTX_FULL_12_0.ecf

# 3. import terms and rebuild the canonical mappings
npm run db:seed
```

The importer picks the newest `foodex2-mtx-*.csv` automatically. Both stages
are idempotent: terms are upserted by `code` (ids stay stable) and mappings are
rebuilt from scratch, so re-running never duplicates rows and never leaves a
stale mapping behind.

The same re-seed is what applies a change to `foodex2-canonical.config.ts`. The
config is read only at import time — the search path just reads the stored
`isCanonical` flag — so editing the rules changes nothing until the import runs
again.

## Data quality

The import prints a report and never discards problems silently. For
NEVO 2025 9.0 against MTX 12.0:

```text
Imported terms:         29908
Core terms:             7636
NEVO records:           2328
Mapped FoodEx2 foods:   619      # 2328 NEVO records → 619 searchable foods
  via M/P fallback:     64
Mapped NEVO items:      2317
```

Known issues in that pair, all reported by the importer:

- **4 codes missing from MTX** (`A18PR`, `A18PS`, `A18SV`, `A19EK`) — newer than
  MTX 12.0. They resolve once the catalogue is upgraded.
- **2 codes with no usable concept** (`A00FJ`, `A026T`).
- **29 concepts with tied canonical candidates** — resolved deterministically by
  the lowest NEVO code, but worth a curator's eye.
- A concept whose only NEVO candidate contradicts its name (e.g. `A007E`
  "Pasta, plain (not stuffed), uncooked" has just one mapped record, a boiled
  one). The mapping is NEVO's own; there is no alternative to elect.

## Translations

MTX ships English names only, so a FoodEx2 concept is localized through the
same `entity_translations` pipeline as everything else. `Foodex2Term` is a
registered translatable entity with one field, `name`.

Pass `lang` to search and it does two things:

1. **Displays** the translated concept name, falling back to the English MTX
   name. Both are returned — `name` (localized) and `nameEn` (canonical).
2. **Matches** against the translated names of the concept's NEVO records. This
   is why `?search=Nudeln&lang=de` finds _Dried pasta_ even before any FoodEx2
   concept name has been translated: all 2328 NEVO records already carry German
   names from `nevo_translations.csv`.

Ranking puts a match on the **canonical** NEVO name (tiers 7-8) above a match
on any other variant (tier 9). Without that split, searching _Nudeln_ surfaced
"Meat soup" ahead of "Dried pasta", because a soup variant is called
_Klare Suppe mit Nudeln_.

All 619 concept names ship translated into every supported locale
(`no de el es it nl pl sl`) in
`prisma/seeds/data/foodex2/foodex2-translations.csv`, loaded by
`npm run db:translations`. The step upserts, so a corrected CSV simply
overwrites the previous values.

> These translations were produced by an LLM, not reviewed by native speakers.
> They are good enough to make search work in every locale, but should go
> through the normal partner review before being treated as final. Terminology
> was chosen for consumer search rather than regulatory accuracy — German uses
> _Nudeln_ rather than the formal _Teigwaren_, for example, because that is
> what a user types.

Concept names travel in the **master partner workbook**, on the
`food-foodex2` sheet, next to `food-names` and `food-groups`:

```bash
npm run i18n:workbook:export          # writes the food-foodex2 sheet
# … partner edits the locale columns …
npm run i18n:workbook:import          # writes back to the CSV
npm run db:translations               # loads the CSV into entity_translations
```

The sheet is keyed by FoodEx2 code, with `en` plus one column per locale.
Editing a cell updates exactly that cell in the CSV; codes no longer in the CSV
are ignored rather than appended, so the English source stays authoritative.

Only the ~619 concepts with a canonical NEVO record appear — not all 30k MTX
terms.

`Foodex2Term` is deliberately **excluded** from `i18n:export:db`. That route
writes `entity_translations` directly, which would give two independent write
paths to the same rows; whichever ran last would silently win. The CSV is the
single source of truth.

`entity-handoff.xlsx` uses the same layout as the partner translation
workbook: one sheet per entity type, with columns `key`, `en` and one column
per locale, so a translator sees every language for a key side by side. The
importer also still accepts the older one-sheet-per-locale files.

### Known gaps

- Until concept names are translated, a German user matches on German NEVO
  names but still sees English labels (`Dried pasta`). `nameEn` is always
  returned so clients can decide how to present that.
- NEVO's German vocabulary does not always match everyday usage: carrots are
  `Karotte roh av`, so `Möhren` only matches an incidental variant and ranks
  low. The `synonyms` column on `foodex2_terms` exists for exactly this kind of
  curation and is searched, but MTX ships none.
