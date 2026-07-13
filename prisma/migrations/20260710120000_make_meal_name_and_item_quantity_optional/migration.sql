-- Make meal name optional and meal item quantity optional.
ALTER TABLE "meals"
  ALTER COLUMN "name" DROP NOT NULL;

ALTER TABLE "meal_items"
  ALTER COLUMN "quantity" DROP DEFAULT,
  ALTER COLUMN "quantity" DROP NOT NULL;
