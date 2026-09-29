-- Quest progress becomes server-derived (finished items / total items).
-- Mirrors the columns mission_progress and challenge_progress gained in
-- 20260916160000_add_rule_driven_progress, minus ruleHash: there is no rule,
-- the derivation is structural.
--
-- All three columns are defaulted or nullable, so this is a non-blocking
-- ALTER. No backfill: existing rows keep their client-written `progress` with
-- status NOT_STARTED until their next recompute, which self-heals.

-- AlterTable
ALTER TABLE "quest_progress" ADD COLUMN "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "quest_progress" ADD COLUMN "state" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "quest_progress" ADD COLUMN "evaluatedAt" TIMESTAMP(3);
