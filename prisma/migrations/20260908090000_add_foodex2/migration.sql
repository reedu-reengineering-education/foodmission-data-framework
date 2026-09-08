-- CreateTable
CREATE TABLE "foodex2_terms" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "shortName" TEXT,
    "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "detailLevel" TEXT NOT NULL,
    "termType" TEXT NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "reportable" BOOLEAN NOT NULL DEFAULT true,
    "termOrder" INTEGER,
    "mtxVersion" TEXT NOT NULL,
    "parentCode" TEXT,

    CONSTRAINT "foodex2_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foodex2_nevo_mappings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "foodex2Code" TEXT NOT NULL,
    "nevoCode" INTEGER NOT NULL,
    "sourceFoodex2Code" TEXT NOT NULL,
    "hierarchyDepth" INTEGER NOT NULL DEFAULT 0,
    "isCanonical" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "selectionReason" TEXT,

    CONSTRAINT "foodex2_nevo_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "foodex2_terms_code_key" ON "foodex2_terms"("code");

-- CreateIndex
CREATE INDEX "foodex2_terms_name_idx" ON "foodex2_terms"("name");

-- CreateIndex
CREATE INDEX "foodex2_terms_parentCode_idx" ON "foodex2_terms"("parentCode");

-- CreateIndex
CREATE INDEX "foodex2_terms_detailLevel_idx" ON "foodex2_terms"("detailLevel");

-- CreateIndex
CREATE INDEX "foodex2_terms_isCore_idx" ON "foodex2_terms"("isCore");

-- CreateIndex
CREATE INDEX "foodex2_nevo_mappings_foodex2Code_idx" ON "foodex2_nevo_mappings"("foodex2Code");

-- CreateIndex
CREATE INDEX "foodex2_nevo_mappings_nevoCode_idx" ON "foodex2_nevo_mappings"("nevoCode");

-- CreateIndex
CREATE INDEX "foodex2_nevo_mappings_isCanonical_idx" ON "foodex2_nevo_mappings"("isCanonical");

-- CreateIndex
CREATE UNIQUE INDEX "foodex2_nevo_mappings_foodex2Code_nevoCode_key" ON "foodex2_nevo_mappings"("foodex2Code", "nevoCode");

-- AddForeignKey
ALTER TABLE "foodex2_terms" ADD CONSTRAINT "foodex2_terms_parentCode_fkey" FOREIGN KEY ("parentCode") REFERENCES "foodex2_terms"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foodex2_nevo_mappings" ADD CONSTRAINT "foodex2_nevo_mappings_foodex2Code_fkey" FOREIGN KEY ("foodex2Code") REFERENCES "foodex2_terms"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foodex2_nevo_mappings" ADD CONSTRAINT "foodex2_nevo_mappings_nevoCode_fkey" FOREIGN KEY ("nevoCode") REFERENCES "generic_foods"("nevoCode") ON DELETE CASCADE ON UPDATE CASCADE;


-- A FoodEx2 concept resolves to exactly zero or one canonical NEVO item.
-- Expressed as a partial unique index because Prisma cannot model it in the schema.
CREATE UNIQUE INDEX "foodex2_nevo_mappings_one_canonical_per_term"
  ON "foodex2_nevo_mappings" ("foodex2Code")
  WHERE "isCanonical";

-- Case-insensitive prefix/substring search on the user-facing FoodEx2 names.
CREATE INDEX "foodex2_terms_name_lower_idx" ON "foodex2_terms" (LOWER("name"));
CREATE INDEX "foodex2_terms_short_name_lower_idx" ON "foodex2_terms" (LOWER("shortName"));
