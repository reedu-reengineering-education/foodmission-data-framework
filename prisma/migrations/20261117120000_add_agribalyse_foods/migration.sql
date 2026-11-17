-- CreateTable
CREATE TABLE "agribalyse_foods" (
    "code" TEXT NOT NULL,
    "ciqualCode" INTEGER NOT NULL,
    "foodGroup" TEXT NOT NULL,
    "foodSubgroup" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "preparation" TEXT NOT NULL,
    "dqr" DOUBLE PRECISION NOT NULL,
    "efScorePerKg" DOUBLE PRECISION NOT NULL,
    "co2PerKg" DOUBLE PRECISION NOT NULL,
    "version" TEXT NOT NULL,

    CONSTRAINT "agribalyse_foods_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "agribalyse_foods_ciqualCode_idx" ON "agribalyse_foods"("ciqualCode");

