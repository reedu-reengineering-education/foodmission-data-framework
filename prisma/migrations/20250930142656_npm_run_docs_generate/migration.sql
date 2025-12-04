-- CreateTable
CREATE TABLE "public"."Pantry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Pantry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pantry_items" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'pieces',
    "notes" TEXT,
    "location" TEXT,
    "expiryDate" TIMESTAMP(3),
    "pantryId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pantry_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pantry_userId_idx" ON "public"."Pantry"("userId");

-- CreateIndex
CREATE INDEX "pantry_items_pantryId_idx" ON "public"."pantry_items"("pantryId");

-- AddForeignKey
ALTER TABLE "public"."Pantry" ADD CONSTRAINT "Pantry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pantry_items" ADD CONSTRAINT "pantry_items_pantryId_fkey" FOREIGN KEY ("pantryId") REFERENCES "public"."Pantry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pantry_items" ADD CONSTRAINT "pantry_items_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
