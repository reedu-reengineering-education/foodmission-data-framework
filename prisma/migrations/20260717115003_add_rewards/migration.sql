-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "points" INTEGER,
    "xp" INTEGER,
    "badge" TEXT,
    "avatarItem" TEXT,
    "petItem" TEXT,
    "collectible" TEXT,
    "collectibleShareable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rewards_name_key" ON "rewards"("name");
