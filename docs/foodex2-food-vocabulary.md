# FoodEx2 food vocabulary

The user-facing food search is `GET /generic-foods?search=`. It returns
**NEVO** records — the only source of nutritional values — and uses
**FoodEx2**, EFSA's food classification, to decide which of them collapse into
one result.

```text
NEVO generic food          generic_foods           ← every result is one of these
    ↑ canonical mapping    foodex2_nevo_mappings (isCanonical)
FoodEx2 food name          foodex2_terms           ← decides what collapses
```

## One endpoint

| Request                                | Returns                                    |
| -------------------------------------- | ------------------------------------------ |
| `GET /generic-foods?search=pasta`      | Ranked search, variants collapsed (below)  |
| `GET /generic-foods?foodex2Code=A007L` | The NEVO records behind one result         |
| `GET /generic-foods`                   | Plain NEVO catalogue in name order (admin) |

`lang`, `foodGroup`, `page` and `limit` work on all three.

## Collapse only into what the user named

NEVO has five pasta records, so a plain search for _pasta_ is noisy — that is
why FoodEx2 was brought in. But always answering with a FoodEx2 concept loses
the food whenever the concept is broad: _Lasagne_ is filed under _Pasta based
dishes_, whose canonical record is bami goreng. So search follows three rules:

1. **The query names a FoodEx2 food** (in the requested locale or English):
   one row for that food, carrying its canonical NEVO record. Every record
   filed under it is hidden behind the row. _Kartoffeln_ → _Kartoffeln und
   ähnliche_ standing for 12 potato records. Exception: when a record's
   whole name is the query, the user named that record — _Banane_ answers
   "Banane", not the plantain that represents _Bananen und ähnliche_.
   And a concept with a single record collapses nothing, so that record
   answers under its own name: _Nudeln ungefüllt ungekocht_ holds one record,
   boiled pasta, which shows as "Weiße Nudeln, gekocht" (see Data quality).
2. **The query names only a NEVO record**: that record. Records sharing a
   FoodEx2 code fold into the best-matching one — _beef_ → "Beef av raw"
   standing for the beef cuts filed with it.
3. **Dishes never collapse.** Records of a concept of MTX term type `c`
   (composite — _Pasta based dishes_, _Meat based dishes_, _Finger food_,
   _Pizza and pizza-like dishes_, _Cakes_) are always returned individually,
   even when they share an extended term: "Lasagne Bolognese" and "Lasagne
   mit Gemüse" are two dishes, not variants of one food, and bami goreng is
   no stand-in for either. The term types are configured in
   `nonCollapsibleTermTypes`.

Measured on NEVO 2025 against 37 everyday queries, this returns 489 rows
that name the food, plus 184 ingredient mentions ranked last (tier 6 below).
The raw NEVO search returns 1370 rows, an always-collapse search 361 — but
that one answers _Lasagne_ with bami goreng.

### Ranking

A name is matched on its **head** — everything before the first comma or
modifier word (`mit`, `with`, `w`, `wo`, `und`, `aus`, …) — because NEVO names
are head-first and what follows is an ingredient. Tiers, best first:

| Tier | Match                                                   | Example                    |
| ---- | ------------------------------------------------------- | -------------------------- |
| 0    | The whole name is the query                             | "Gulasch", "Banane"        |
| 1    | Head is the query, or starts with it as a word          | "Kartoffeln, roh"          |
| 2    | A head word is the query, or the last word ends with it | "Vollmilch", "Weißer Reis" |
| 3    | Head starts with the query inside a compound            | "Milchschokolade"          |
| 4    | A later head word starts with it                        | "Rohes Möhrenbündel"       |
| 5    | Substring of the head                                   |                            |
| 6    | Only mentioned after the head (an ingredient)           | "Omelett mit Kartoffeln"   |

Tier 1 deliberately does not separate "Hummus mit Gemüse" (head cut to
"hummus") from "Hummus natur": a shorter head is no better a match. Tier 2
reads the _last_ word because the food is named last, in a German
compound and in the phrase around it: "Vollmilch" is milk, "Alkoholfreier
Wein" is not eggs. A hit through the English name while another locale was
requested ranks after every hit in that locale.

Ties break on: a concept before a single record; between concepts, the one
with more NEVO records (the more common food: _Kuhmilch_ before
_Muttermilch_); then the canonical-election score (plainer records first);
then the shorter name. Ordering is fully deterministic.

A trailing German plural `-n` is stripped before matching, so _Kartoffeln_
reaches "Kartoffelpüree" and _Frühlingsrollen_ finds "Frühlingsrolle".

The rules live in
[`src/generic-foods/search/food-search.ranking.ts`](../src/generic-foods/search/food-search.ranking.ts)
as a pure function; the repository only loads substring candidates from the
2.3k records, and the service paginates the ranked list.

### Response

Every row is a real NEVO record: `id` is its GenericFood id, valid as
`genericFoodId` for pantry and shopping items, and every nutrient is that
record's value — never an average. Search rows add:

| Field          | Meaning                                                         |
| -------------- | --------------------------------------------------------------- |
| `isConcept`    | Row stands for a FoodEx2 food the query named (rule 1)          |
| `foodName`     | FoodEx2 name on a concept row, NEVO name otherwise (localized)  |
| `nevoFoodName` | Name of the NEVO record whose values the row carries            |
| `foodex2Code`  | Code the row collapses; `null` if not collapsed                 |
| `variantCount` | Records `?foodex2Code=` lists for the row; 1 when not collapsed |

A concept row's `id` follows the canonical record, so retuning
`foodex2-canonical.config.ts` can change it. Persisted pantry rows keep a valid
foreign key; a client caching a concept's identity should key on
`foodex2Code`.

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

A FoodEx2 concept maps to many NEVO records, so one is elected as canonical —
the record a concept row carries (rule 1) and the order of a `?foodex2Code=`
listing.
Values are **never averaged** — dry and cooked pasta differ mostly in water
content, so a mean would be misleading.

All rules live in
[`src/generic-foods/foodex2/foodex2-canonical.config.ts`](../src/generic-foods/foodex2/foodex2-canonical.config.ts)
as data, not logic. The default prefers **raw / as-bought** variants, because
`GenericFood` is consumed by pantry items, shopping-list items, recipe
ingredients and food waste — all ingredient-shaped. Change
`preparationRules` if the product becomes as-consumed oriented.

Scoring, in order of weight: preparation state → NEVO's own generic averages
(`av`) → penalties for fortified variants, for specific ones (`prod`, `w`, `/`)
and for records named after what was added to them (`filled`, `stuffed`,
`spiced`, `breaded`, `coated`, `seasoned`, `flavoured`) → hierarchy distance →
name length. That last penalty is what makes _Egg based dishes_ resolve to
"Omelette/scrambled eggs" rather than "Foe jung hai filled omelet wo rice". Ties break on the lowest NEVO code, so the outcome is
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
`isCanonical` flag — so editing the rules changes nothing until
the import runs again.

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
- **27 concepts with tied canonical candidates** — resolved deterministically by
  the lowest NEVO code, but worth a curator's eye.
- **A cooked record can sit under a raw-named concept.** NEVO codes a cooked
  food as the raw commodity plus a FoodEx2 process facet (`F28`): "Pasta white
  av boiled" is `A007E` _Pasta, plain (not stuffed), uncooked_ + `F28.A07GL`
  _Boiling_. The importer reads only the base term, and `A007E` holds just that
  one record — so search shows a single-record concept under the record's own
  name (rule 1) rather than the misleading concept label. Facets are otherwise
  ignored: records under one concept can differ in preparation, fat content,
  added ingredients or fortification, and a concept row shows its canonical
  record's values. `?foodex2Code=` lists the alternatives.

## Translations

MTX ships English names only, so a FoodEx2 concept is localized through the
same `entity_translations` pipeline as everything else. `Foodex2Term` is a
registered translatable entity with one field, `name`.

Pass `lang` and search matches names in that locale first, then the English
source names at a penalty (see Ranking). A concept row shows the translated
FoodEx2 name, falling back to the English MTX name. Until a concept name is
translated, a German query cannot name the concept, so it answers with the
matching NEVO records instead — _Nudeln_ still finds "Weiße Nudeln, roh".

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

## Vocabulary granularity

The vocabulary of _named_ foods stops at **core** terms — only those carry
translated names. Extended terms (`A040F Spring rolls`, `A040P Lasagna`) still
shape results: records filed under one fold into a single row (rule 2), shown
under the best-matching record's name. So _Frühlingsrolle_ answers "Frühlingsrolle,
tiefgekühlt" rather than _Fingerfood_, without translating the 447 extended
terms that carry records.

### Known gaps

- Canonical election is heuristic, and a few picks are poor stand-ins:
  _Butter_ carries "Herb butter", _Cow milk_ carries "Milk raw". This only
  shows on concept rows — a query naming the specific record still finds it,
  and `?foodex2Code=` lists the alternatives.
- A food NEVO does not carry cannot be found under any name — NEVO 2025 has no
  _Sommerrolle_ in any language, so nothing matches it. The `synonyms` column on
  `foodex2_terms` is searched and would be the place for aliases, but MTX ships
  none and nothing else fills it.
- NEVO's German vocabulary does not always match everyday usage: carrots are
  `Karotte roh av`, so `Möhren` does not name _Karotten und ähnliche_ and only
  finds the few records that say _Möhre_. The `synonyms` column on `foodex2_terms` exists for exactly this kind of
  curation and is searched, but MTX ships none.
