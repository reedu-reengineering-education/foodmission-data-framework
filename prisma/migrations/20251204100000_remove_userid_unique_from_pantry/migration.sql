-- Drop the old unique constraint on userId if it exists
-- This allows users to have multiple pantries with different titles
-- Try dropping as constraint first, then as index
ALTER TABLE "public"."Pantry" DROP CONSTRAINT IF EXISTS "Pantry_userId_key";
DROP INDEX IF EXISTS "public"."Pantry_userId_key";

-- Ensure the composite unique constraint exists (should already exist from previous migration)
-- This constraint allows multiple pantries per user but prevents duplicate titles
CREATE UNIQUE INDEX IF NOT EXISTS "Pantry_userId_title_key" ON "public"."Pantry"("userId", "title");

