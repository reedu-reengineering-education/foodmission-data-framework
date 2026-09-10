-- RenameForeignKey
ALTER TABLE "user_earned_badges" RENAME CONSTRAINT "user_earned_badges_userId_fkey" TO "user_earned_badges_userId_user_fkey";

-- AddForeignKey
ALTER TABLE "user_earned_badges" ADD CONSTRAINT "user_earned_badges_userId_wallet_fkey" FOREIGN KEY ("userId") REFERENCES "user_gamification_wallets"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
