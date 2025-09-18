/*
  Warnings:

  - A unique constraint covering the columns `[userId,title]` on the table `ShoppingList` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "public"."shopping_list_items" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'pieces',
    "notes" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "shoppingListId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shopping_list_items_shoppingListId_idx" ON "public"."shopping_list_items"("shoppingListId");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_items_shoppingListId_foodId_key" ON "public"."shopping_list_items"("shoppingListId", "foodId");

-- CreateIndex
CREATE INDEX "ShoppingList_userId_idx" ON "public"."ShoppingList"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingList_userId_title_key" ON "public"."ShoppingList"("userId", "title");

-- AddForeignKey
ALTER TABLE "public"."shopping_list_items" ADD CONSTRAINT "shopping_list_items_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "public"."ShoppingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shopping_list_items" ADD CONSTRAINT "shopping_list_items_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
