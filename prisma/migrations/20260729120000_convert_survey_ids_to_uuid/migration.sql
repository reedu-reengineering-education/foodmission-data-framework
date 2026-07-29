-- Survey/Question/SurveyResponse/QuestionResponse switch from @default(cuid())
-- to @default(uuid()), matching every other model in the schema. Both
-- generators run in Prisma Client, not Postgres, so there is no column or
-- constraint to alter here.
--
-- Existing rows keep their old cuid-formatted ids either way, and the
-- surveys feature has no production data yet, so we just clear the tables
-- instead of leaving a mix of id formats around. Re-seed after this runs
-- (`npm run db:seed` / `db:seed:prod`, then `npm run db:translations`).
TRUNCATE TABLE "question_responses", "survey_responses", "questions", "surveys" CASCADE;
