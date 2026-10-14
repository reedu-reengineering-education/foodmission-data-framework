-- Halal and kosher are no longer offered as dietary preferences.

-- Strip them from meals, then recreate the enum without them (Postgres can't
-- drop a value from an enum in place).
UPDATE "meals"
SET "dietaryLabels" = array_remove(array_remove("dietaryLabels", 'HALAL'), 'KOSHER')
WHERE "dietaryLabels" && ARRAY['HALAL', 'KOSHER']::"DietaryLabel"[];

ALTER TYPE "DietaryLabel" RENAME TO "DietaryLabel_old";
CREATE TYPE "DietaryLabel" AS ENUM ('VEGAN', 'VEGETARIAN', 'PESCATARIAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'NUT_FREE');
ALTER TABLE "meals" ALTER COLUMN "dietaryLabels" DROP DEFAULT;
ALTER TABLE "meals"
    ALTER COLUMN "dietaryLabels" TYPE "DietaryLabel"[]
    USING ("dietaryLabels"::text[]::"DietaryLabel"[]);
ALTER TABLE "meals" ALTER COLUMN "dietaryLabels" SET DEFAULT ARRAY[]::"DietaryLabel"[];
DROP TYPE "DietaryLabel_old";

-- Saved preferences are free JSON (users and group members). Drop halal and
-- kosher from a `dietaryPreference` list, or the key when it holds one of them.
UPDATE "users"
SET "preferences" = jsonb_set(
    "preferences"::jsonb,
    '{dietaryPreference}',
    COALESCE(
        (SELECT jsonb_agg(v)
         FROM jsonb_array_elements("preferences"::jsonb -> 'dietaryPreference') AS v
         WHERE upper(v #>> '{}') NOT IN ('HALAL', 'KOSHER')),
        '[]'::jsonb))
WHERE jsonb_typeof("preferences"::jsonb -> 'dietaryPreference') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements("preferences"::jsonb -> 'dietaryPreference') AS v
    WHERE upper(v #>> '{}') IN ('HALAL', 'KOSHER'));

UPDATE "users"
SET "preferences" = "preferences"::jsonb - 'dietaryPreference'
WHERE jsonb_typeof("preferences"::jsonb -> 'dietaryPreference') = 'string'
  AND upper("preferences"::jsonb ->> 'dietaryPreference') IN ('HALAL', 'KOSHER');

UPDATE "group_memberships"
SET "preferences" = jsonb_set(
    "preferences"::jsonb,
    '{dietaryPreference}',
    COALESCE(
        (SELECT jsonb_agg(v)
         FROM jsonb_array_elements("preferences"::jsonb -> 'dietaryPreference') AS v
         WHERE upper(v #>> '{}') NOT IN ('HALAL', 'KOSHER')),
        '[]'::jsonb))
WHERE jsonb_typeof("preferences"::jsonb -> 'dietaryPreference') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements("preferences"::jsonb -> 'dietaryPreference') AS v
    WHERE upper(v #>> '{}') IN ('HALAL', 'KOSHER'));

UPDATE "group_memberships"
SET "preferences" = "preferences"::jsonb - 'dietaryPreference'
WHERE jsonb_typeof("preferences"::jsonb -> 'dietaryPreference') = 'string'
  AND upper("preferences"::jsonb ->> 'dietaryPreference') IN ('HALAL', 'KOSHER');
