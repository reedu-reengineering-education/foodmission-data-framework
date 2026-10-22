-- Search matches names with punctuation treated as spaces, so "olio d'oliva"
-- finds "Olio d’oliva" and "elstar eple" finds "Elstar-eple".
--
-- The character class is explicit (not [^[:alnum:]]) so it never removes
-- letters, whatever the database locale: under a C ctype [:alnum:] is ASCII
-- only and would delete æ, ø, é, Greek, ... The same set is mirrored in
-- src/generic-foods/utils/search-ranking.ts (SEARCH_SEPARATOR_CHARS).
--
-- IMMUTABLE: Postgres will not recompute index entries if this definition
-- changes. Any change here must REINDEX the *_norm_trgm_idx indexes below.
CREATE OR REPLACE FUNCTION search_normalize(input text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$
  SELECT trim(regexp_replace(lower(input), '[[:space:][:punct:]’‘´“”„«»‹›–—…·]+', ' ', 'g'))
$$;

-- Raw-column trigram indexes are replaced by indexes on the normalized text.
DROP INDEX IF EXISTS "generic_foods_food_name_trgm_idx";
DROP INDEX IF EXISTS "generic_foods_synonym_trgm_idx";
DROP INDEX IF EXISTS "entity_translations_value_trgm_idx";

CREATE INDEX "generic_foods_food_name_norm_trgm_idx"
  ON "generic_foods" USING GIN (search_normalize("foodName") gin_trgm_ops);
CREATE INDEX "generic_foods_synonym_norm_trgm_idx"
  ON "generic_foods" USING GIN (search_normalize("synonym") gin_trgm_ops);
CREATE INDEX "entity_translations_value_norm_trgm_idx"
  ON "entity_translations" USING GIN (search_normalize("value") gin_trgm_ops);
