-- Allow multiple pantry items for the same food product / generic food
-- (e.g. same product with different expiration dates)
DROP INDEX IF EXISTS "pantry_items_pantryId_foodProductId_key";
DROP INDEX IF EXISTS "pantry_items_pantryId_genericFoodId_key";
