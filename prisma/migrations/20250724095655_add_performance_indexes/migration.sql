-- CreateIndex
CREATE INDEX "foods_name_idx" ON "foods"("name");

-- CreateIndex
CREATE INDEX "foods_categoryId_idx" ON "foods"("categoryId");

-- CreateIndex
CREATE INDEX "foods_createdAt_idx" ON "foods"("createdAt");

-- CreateIndex
CREATE INDEX "foods_name_categoryId_idx" ON "foods"("name", "categoryId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
