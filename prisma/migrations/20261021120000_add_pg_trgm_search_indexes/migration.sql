-- Trigram matching for typo-tolerant / substring name search.
-- pg_trgm is a trusted extension (PG13+), so the database owner can create it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "entity_translations_value_trgm_idx" ON "entity_translations" USING GIN ("value" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "generic_foods_food_name_trgm_idx" ON "generic_foods" USING GIN ("foodName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "generic_foods_synonym_trgm_idx" ON "generic_foods" USING GIN ("synonym" gin_trgm_ops);
