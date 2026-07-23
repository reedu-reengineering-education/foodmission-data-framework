-- Enforce exactly one owner on progress indicators (user XOR group).
ALTER TABLE "progress_indicators"
ADD CONSTRAINT "progress_indicators_owner_xor"
CHECK (
  ("userId" IS NOT NULL AND "groupId" IS NULL)
  OR
  ("userId" IS NULL AND "groupId" IS NOT NULL)
);
