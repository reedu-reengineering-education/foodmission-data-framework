-- CreateEnum
CREATE TYPE "WasteReason" AS ENUM ('EXPIRED', 'SPOILED', 'OVERCOOKED', 'UNWANTED', 'PORTION_TOO_LARGE', 'OTHER');

-- CreateEnum
CREATE TYPE "DetectionMethod" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateTable
CREATE TABLE "food_waste" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pantryItemId" TEXT,
    "foodId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "wasteReason" "WasteReason" NOT NULL,
    "detectionMethod" "DetectionMethod" NOT NULL,
    "notes" TEXT,
    "costEstimate" DOUBLE PRECISION,
    "carbonFootprint" DOUBLE PRECISION,
    "wastedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_waste_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "food_waste_userId_wastedAt_idx" ON "food_waste"("userId", "wastedAt");

-- CreateIndex
CREATE INDEX "food_waste_foodId_idx" ON "food_waste"("foodId");

-- CreateIndex
CREATE INDEX "food_waste_detectionMethod_idx" ON "food_waste"("detectionMethod");

-- CreateIndex
CREATE INDEX "food_waste_wasteReason_idx" ON "food_waste"("wasteReason");

-- AddForeignKey
ALTER TABLE "food_waste" ADD CONSTRAINT "food_waste_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_waste" ADD CONSTRAINT "food_waste_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_waste" ADD CONSTRAINT "food_waste_pantryItemId_fkey" FOREIGN KEY ("pantryItemId") REFERENCES "pantry_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
