-- CreateTable
CREATE TABLE "entity_translations" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entity_translations_entityType_locale_field_idx" ON "entity_translations"("entityType", "locale", "field");

-- CreateIndex
CREATE INDEX "entity_translations_entityType_entityId_idx" ON "entity_translations"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "entity_translations_entityType_entityId_locale_field_key" ON "entity_translations"("entityType", "entityId", "locale", "field");
