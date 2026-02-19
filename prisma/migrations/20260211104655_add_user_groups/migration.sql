



CREATE TYPE "GroupRole" AS ENUM ('ADMIN', 'MEMBER');

CREATE TABLE "user_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "age" INTEGER,
    "gender" "Gender",
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "activityLevel" "ActivityLevel",
    "annualIncome" "AnnualIncomeLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "virtual_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_groups_inviteCode_key" ON "user_groups"("inviteCode");

-- CreateIndex
CREATE INDEX "user_groups_inviteCode_idx" ON "user_groups"("inviteCode");

-- CreateIndex
CREATE INDEX "user_groups_createdBy_idx" ON "user_groups"("createdBy");

-- CreateIndex
CREATE INDEX "group_memberships_groupId_idx" ON "group_memberships"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "group_memberships_userId_groupId_key" ON "group_memberships"("userId", "groupId");

-- CreateIndex
CREATE INDEX "virtual_members_groupId_idx" ON "virtual_members"("groupId");

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_members" ADD CONSTRAINT "virtual_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
