# Analytics redesign — plan

Status: Phase 1 (without the datasets move) and the Phase 2 insights implemented (2026-10-16). See section 9.
Scope of this round: the "simple things", i.e. engagement and usage insights for admins.
Later rounds: in-depth user behaviour and food-consumption analytics, plus refactoring the batch datasets.

## 1. Decisions taken

| #   | Topic               | Decision                                                                                                                                                                                                  |
| --- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Learning dimensions | The 6 codes `FOOD_WASTE`, `DIET_CHANGES`, `PRODUCTION_METHODS`, `NUTRITION_VALUES`, `PRODUCT_CHOICES`, `PACKAGING` (table `dimensions`).                                                                  |
| D2  | Audience            | New insights are **admin-only**, live, no public route.                                                                                                                                                   |
| D3  | Minimum group size  | Breakdowns by user properties (country, age group, …) hide groups with **fewer than 5 users**. For now `MIN_GROUP_SIZE = 1` (admin-only, internal); proper k-anonymity comes with the behaviour analysis. |
| D4  | Publishing          | Live insights need no batch, no approval, no cron. Only the batch datasets (meal-log, shopping-list) keep the approval step — see open question Q2.                                                       |

## 2. What exists today (findings)

### 2.1 Two unrelated things share `src/analytics`

- **Batch datasets** (`meal-log/`, `shopping-list/`, `common/`, `analytics-batch-coordinator.service.ts`, `analytics.controller.ts`): about 6.4k LOC, 23 Prisma tables in `prisma/models/analytics-*.prisma`. Daily `@Cron(EVERY_DAY_AT_2AM)` → aggregate yesterday in JS → write per-metric tables → public `@Public()` routes.
- **Live usage** (`usage/`): admin-only raw SQL over `users` and `user_events` (overview, breakdown, weekly trend, trend by breakdown). Small and clean.

### 2.2 Problems in the batch side (not fixed this round; recorded for later)

- `BaseAnalyticsService.runDailyAggregation()` publishes daily batches directly as `'system'`, skipping STAGING → APPROVED. `docs/Data anonymization/DATA_ANONYMIZATION_PROCESS.md` promises human approval. Code and doc disagree (see Q2).
- Overlapping PUBLISHED batches are all served and summed: no unique period, no auto-supersede, rows are not filtered by their own date. Counts can be double counted.
- `GET /analytics/meal-log/public/records` serves per-meal microdata publicly with no k-anonymity. The UI does not use it.
- Suppressed small groups can be recovered by subtracting the other groups from the published totals (no complementary suppression).
- Adding one metric touches about 10 files and 15+ edit sites, times 3 (base / single breakdown / cross breakdown tables).
- Correctness: vegetarian/vegan defaults to true; only gram units are scaled; quick logs (no `mealId`) are dropped; a unique index omits `foodGroup`.
- Tests mock Prisma, so the raw SQL never runs in tests.

### 2.3 Cross-cutting problems

- **Name clash:** in the analytics API and the UI, "dimension" means a demographic axis (country, age group). In gamification it means a learning dimension. New name for the demographic axis: **breakdown**.
- **User properties are defined three ways:** batch uses 5 (ageGroup, country, educationLevel, gender, region), usage uses 4 (country, ageGroup, gender, language). Missing values are labelled `'__null__'`, dropped, or `'unknown'`. Country is normalised in usage but read raw in batch.
- **Crons:** `ScheduleModule.forRoot()` is registered only in `AnalyticsModule` (`src/analytics/analytics.module.ts`). The crons in `meal-log-draft-cleanup.scheduler.ts` and `rules-deadline.scheduler.ts` depend on it.
- **Admin activity counts as usage:** dashboard requests by admins refresh `lastLoginAt`.

### 2.4 Frontend (`../foodmission-data-ui`)

- Uses 26 of the 52 analytics routes: 11 meal-log public, 11 shopping-list public, 4 usage through the `/api/usage/[...path]` proxy.
- The proxy has a hard-coded 4-path allowlist under `/analytics/usage`. Every new admin endpoint needs a UI change.
- Charts are generic "rows + series keys" cards. A generic `{group, values}` response maps onto them directly.
- Lists are hard-coded in the UI (breakdowns, labels, age-group order, meal types incl. stale `SPECIAL_DRINKS`).

### 2.5 Gamification data — what can be measured

The catalog holds 6 dimensions, 26 topics, 79 quests (561 items), 90 missions, 90 challenges, 130 quizzes, 250 food facts, 0 micro-learnings and 10 badges.

**How a user "selects" a dimension today** (there is no explicit "pick a dimension" API):

1. **Level per dimension** (`user_dimension_levels`): inferred from the onboarding survey (raise-only), can be overridden through `PATCH /users/me` `dimensionLevels`, and rises when every available quest at the level is completed (`DIMENSION_LEVEL_UP` event). Every user has one row per dimension, so the existence of a row is not a choice.
2. **Current quest** (`users.currentQuestId`): the quest's `dimensionId` and `level` show what the user is actually working on.
3. Group current quest (`user_groups.currentQuestId`).
4. `preferences.motivation` (JSON).

**Known semantics that must be respected in queries:**

- `completed` is the truth; `status` is unreliable on older and seed rows (no backfill).
- Picking a quest seeds mission/challenge rows as `NOT_STARTED` with `startedAt` = selection time. These are not starts.
- The hourly rules cron auto-fails missions after 7 days, with `MISSION_FAILED` and no `MISSION_STARTED`. That is a timeout, not an active failure.
- All 90 challenges have no rule, so they are self-reported only. Missions can also be self-reported through PATCH. Rule-verified and self-reported completions must be counted separately (`metadata.source` `RULE_ENGINE` vs `api`; `state.source`).
- `quest_progress` rows appear at the first recompute after a completion-type event, not at selection. `QUEST_STARTED` comes only from an admin override route.
- Quiz rows keep only the first and last answer; food-fact rows only the first and last read.
- Group quests do not drive member progress (rules and recompute ignore them, events have no `groupId`). Leave them out of this round.

## 3. Target structure

```
src/analytics/
  analytics.module.ts
  shared/
    breakdowns.ts     one registry of user properties: key, SQL expression,
                      normalisation, 'unknown' bucket, ordered values, labels
    privacy.ts        min group size (5), roll small groups into "other",
                      suppressed-count reporting
    insight-response.ts  { meta, rows: [{ group: {...}, values: {...} }] }
    query-params.ts   shared DTO: breakdown, breakdown2?, from, to, interval
  insights/           admin-only, live SQL, no tables, no cron
    catalog.controller.ts   GET /analytics/admin/catalog
    usage/                  moved from src/analytics/usage
    learning/               dimensions, quests, missions, challenges,
                            quizzes, food facts, badges, XP
  datasets/           public, batched (meal-log, shopping-list) — moved, unchanged this round
```

Rules:

- All admin routes live under `/analytics/admin/*`, guarded by `DataBaseAuthGuard` + `@Roles('admin')`, never `@Public()`.
- One response envelope for every insight: `{ meta: { insight, breakdowns, from, to, minGroupSize, suppressedGroups }, rows: [{ group: { country: 'DE', ageGroup: '25_34' }, values: { users: 42 } }] }`.
- The catalog endpoint lists insights, breakdowns (with ordered values and labels), learning dimensions and the minimum group size, so the UI stops hard-coding them.
- One file per insight: SQL builder plus a short doc comment with exact semantics. Adding an insight means one file plus one controller route. No migration.
- Set-based SQL, one round trip per request (DB and API are in different datacenters).
- Prisma 6 `$queryRaw` with `Prisma.sql`, no preview features.

### 3.1 Breakdown registry (`shared/breakdowns.ts`)

| key              | source                               | notes                                                    |
| ---------------- | ------------------------------------ | -------------------------------------------------------- |
| `country`        | `UPPER(NULLIF(TRIM(country),''))`    | free text today; ISO-2 expected                          |
| `ageGroup`       | `yearOfBirth` → `under_18 … 65_plus` | reuse `AGE_GROUP_SQL`, ordered                           |
| `gender`         | enum                                 | OTHER/UNSPECIFIED/PREFER_NOT_TO_SAY stay separate values |
| `language`       | `LOWER(NULLIF(TRIM(language),''))`   |                                                          |
| `segment`        | `UserSegment` enum                   | BEGINNER/INTERMEDIATE/ADVANCED                           |
| `motivation`     | `preferences->>'motivation'`         | `Motivation` enum values                                 |
| `educationLevel` | enum                                 |                                                          |
| `region`         | free text                            | quasi-identifier: never in a two-way breakdown           |

- Missing values always go to `'unknown'`.
- Age is computed against the current UTC year.
- At most 2 breakdowns per query.
- Batch datasets keep their own list until they are refactored. Usage switches to the registry.

### 3.2 Privacy rule (`shared/privacy.ts`)

- Groups with `users < 5` are dropped from `rows` and counted in `meta.suppressedGroups`.
- Optionally merge them into an `other` row when the merged row also has ≥ 5 users.
- Applied in SQL (`HAVING COUNT(DISTINCT user_id) >= 5`) or in one shared helper, never per insight.
- Complementary suppression per partition (rows that differ in one sensitive key): a partition never hides a single row or fewer than 5 users in total, so hidden values cannot be recovered by subtraction.

## 4. Insights for this round

All counts are distinct users unless stated. Every insight accepts `breakdown` and optionally `breakdown2`.

### 4.1 Learning dimensions

| insight               | question                                                             | source                                                                                                 |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `dimension-levels`    | How many users are at BEGINNER/INTERMEDIATE/ADVANCED, per dimension? | `user_dimension_levels` ⨝ `dimensions` ⨝ `users` (LEFT JOIN so users without a row count as `unknown`) |
| `dimension-focus`     | Which dimension and level are users currently working on?            | `users.currentQuestId` ⨝ `quests` ⨝ `dimensions`; users without a quest → `none`                       |
| `dimension-level-ups` | How many level-ups, per dimension, per week?                         | `user_events` `DIMENSION_LEVEL_UP`                                                                     |

### 4.2 Progress funnels

| insight              | values                                                                                                                       | rules                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `quest-progress`     | per quest (and rollup per dimension/level): current users, users with progress > 0, completed, avg progress                  | `quest_progress`, `completed` = truth         |
| `mission-progress`   | per mission: assigned, active (progress > 0 or STARTED event), completed (rule vs self-reported), failed (active vs timeout) | `mission_progress` + `MISSION_*` events       |
| `challenge-progress` | same as missions; all self-reported                                                                                          | `challenge_progress` + `CHALLENGE_*` events   |
| `quiz-results`       | per quiz/topic/dimension: answered, final-answer correct rate                                                                | `quiz_progress`                               |
| `food-facts-read`    | per fact/topic/dimension: readers                                                                                            | `food_fact_progress`                          |
| `badges`             | per badge: earned users, earn curve per week                                                                                 | `user_earned_badges`                          |
| `xp`                 | XP distribution (buckets) and XP by source type / dimension                                                                  | `user_gamification_wallets`, `wallet_entries` |

- Mapping content to a dimension: missions, challenges and quests have `dimensionId` directly. Quizzes and food facts go through `topicId` → topic.dimensionId.
- Labels use the English catalog names, keyed by code.

### 4.3 Usage (move, then extend)

- Move the 4 existing endpoints to `/analytics/admin/usage/*` on top of the registry and the envelope.
- Keep the old `/analytics/usage/*` routes as thin aliases until the UI has switched, then delete them.
- New:
  - `sessions`: `APP_SESSION_OPENED` per week (sessions, users with a session, sessions per user), plus platform and appVersion as breakdown-like keys from metadata.
  - `feature-usage`: users per week per event family (meal logging, shopping, scanning/processing, learning, gamification), grouped by `eventType` prefix.
- Define "active" in one place: any client-originated event in the window. Exclude admins (`@Roles('admin')` users) from usage counts.

## 5. Data gaps — producer-side changes

Without these, choice history cannot be reconstructed. They are small and owned by their domain modules. Record events inside the same transaction (`record(tx)`).

1. **`QUEST_SELECTED`** event in `src/users/services/user-profiles.service.ts` (quest switch, around L271–L430) and in `src/user-groups/services/user-groups.service.ts`. Metadata: `{ questId, questCode, dimensionCode, level, previousQuestId, scope: 'USER'|'GROUP', groupId? }`.
2. **`DIMENSION_LEVEL_SET`** event plus a `source` column (`SURVEY | USER | DEFAULT | EARNED`) and `createdAt` on `user_dimension_levels`. Producers: `setLevels()` and `applySurveyLevels()` in `src/gamification/services/dimension-level.service.ts`. Metadata: `{ dimensionCode, from, to, source }`.
3. **No more deletes on quest switch:** `deleteMany` on mission/challenge progress (`user-profiles.service.ts` ~L411/L427, `user-groups.service.ts` ~L304/L320). Replace with an `ABANDONED` status (new `ProgressStatus` value) or emit `MISSION_ABANDONED` / `CHALLENGE_ABANDONED` with the last progress before deleting.
4. **Enrich progress event metadata** (`MISSION_*`, `CHALLENGE_*`, `QUEST_*`, `QUIZ_*`, `LEARNING_FACT_READ`) with `{ questId, dimensionCode, level }`.
5. Optional, later: `completedAt` columns, a quiz attempt counter, emitting `LEARNING_FACT_VIEWED` (a badge counts it but nothing emits it).

Update `docs/event-emission-guide.md` and `src/events/event-types.ts` together with these.

## 6. Phases

### Phase 0 — housekeeping (small PR)

- [ ] **Security:** `PATCH /missions/:id` (`src/missions/controllers/missions.controller.ts:306`) is open to the `user` role and writes the global `available` flag. Change it to `@Roles('admin')`, as for challenges.
- [ ] Move `ScheduleModule.forRoot()` from `AnalyticsModule` to `AppModule`.
- [ ] Add a pg advisory lock around the daily analytics cron (pattern: `badge-rules.service.ts`), in case several replicas run.

### Phase 1 — shared layer + usage move

- [x] `shared/breakdowns.ts`, `shared/privacy.ts`, response envelope, shared query DTO, with unit tests.
- [x] Move `usage/` to `insights/usage/` on the registry; new `/analytics/admin/usage/*` routes. Old routes removed instead of aliased.
- [x] `GET /analytics/admin/catalog`.
- [ ] Move `meal-log/`, `shopping-list/` and `common/` under `datasets/` (file moves only, no behaviour change).
- [x] Integration tests for the raw SQL against `foodmission_test_db` (set `DATABASE_URL` explicitly, otherwise e2e hits the dev DB).

### Phase 2 — learning insights

- [x] `insights/learning/` with the insights from section 4.1 and 4.2.
- [ ] Analytics seed fixture: today's seed gives the 400 demographic users no gamification activity, so learning insights would be empty locally. The fixture should:
  - fill all 17 survey answers (levels and segments vary);
  - set `currentQuestId` and dimension levels;
  - create progress across quests, missions, challenges, quizzes, food facts and badges, with matching events and wallet entries;
  - use enough users to exercise the group-size rule;
  - be set-based (`createMany` / `unnest`), because the prod DB is far away.
- [ ] UI: proxy forwards `/analytics/admin/*`; new "Learning" page built from the catalog.

### Phase 3 — event additions (section 5)

- [ ] `QUEST_SELECTED`, `DIMENSION_LEVEL_SET` + `source` column (migration), ABANDONED instead of delete, enriched metadata.
- [ ] Switch `dimension-focus` over time and the funnels to the new events once data exists.

### Phase 4 — later (separate planning)

- [ ] Refactor `datasets/`: one generic batch table (dataset, period, status, audit) plus one fact table; Postgres `GROUPING SETS` instead of JS grouping; unique period and transactional supersede; filter by row date.
- [ ] Decide on the public `records` microdata and on complementary suppression; align `DATA_ANONYMIZATION_PROCESS.md`.
- [ ] Fix vegetarian/vegan classification (reuse derive-meal-flags), unit scaling, quick logs.
- [ ] In-depth behaviour and food-consumption analytics on top of `MEAL_*` / `SWAP_*` / `NUTRITION_*` events.

## 7. Open questions

- **Q1 — meaning of "selected dimension".** Proposal: report both the dimension of the current quest (`dimension-focus`, what users work on) and the level per dimension (`dimension-levels`), and start recording `QUEST_SELECTED` for history. Confirm, or do we want an explicit "focus dimension" choice in the app?
- **Q2 — approval for batch datasets.** The answer was "only badges approval". Assumption: this meant **batches**, i.e. meal-log/shopping-list datasets keep human approval. Then the daily cron should only stage (not auto-publish), matching the anonymisation doc. Confirm, or did it mean badges (manual badge grants)?
- **Q3 — admins in usage numbers.** Exclude admin accounts from active-user counts?
- **Q4 — public consumers.** Do the public `/analytics/*/public` routes have consumers other than foodmission-data-ui (partners, researchers)? This decides how long the old routes must stay.
- **Q5 — country/language normalisation.** What does the mobile app send (ISO-2 / locale codes or names)? Validate on write instead of normalising at query time?
- **Q6 — deleted users.** Hard deletion cascades events, so live numbers shift backwards. Acceptable for admin insights?

## 8. Checks to run when the dev DB is up

The local DB was not reachable during planning (Colima stopped). Read-only checks to run first:

```sql
SET default_transaction_read_only = on;
SELECT d.code, l.level, COUNT(*) FROM user_dimension_levels l JOIN dimensions d ON d.id = l."dimensionId" GROUP BY 1, 2 ORDER BY 1, 2;
SELECT d.code, q.level, COUNT(*) FROM users u JOIN quests q ON q.id = u."currentQuestId" JOIN dimensions d ON d.id = q."dimensionId" GROUP BY 1, 2;
SELECT status, completed, COUNT(*) FROM mission_progress GROUP BY 1, 2;
SELECT "eventType", COUNT(*), MIN("createdAt"), MAX("createdAt") FROM user_events GROUP BY 1 ORDER BY 2 DESC LIMIT 60;
SELECT UPPER(TRIM(country)), COUNT(*) FROM users GROUP BY 1 ORDER BY 2 DESC;
-- duplicate published batches (double counting)
SELECT "periodStart", COUNT(*) FROM meal_log_analytics_batches WHERE status = 'PUBLISHED' GROUP BY 1 HAVING COUNT(*) > 1;
SELECT code, available FROM quests ORDER BY code; -- stale catalog rows (e.g. QUEST.DIET_CHANGES.BEGINNER.1)
```

## 9. Implementation notes (2026-10-16)

Done: shared layer, usage insights, learning insights, catalog, integration test (`test/analytics-insights.integration.spec.ts`, runs against `TEST_DATABASE_URL`). Not done: anything batch (datasets move, cron lock, `ScheduleModule` move), Phase 0 missions security fix, seed fixture, UI.

Routes (all `DataBaseAuthGuard` + `@Roles('admin')`), query `breakdown`, `breakdown2`, `by` (per insight), `weeks` (time series only, 1–104, default 12):

- `GET /analytics/admin/catalog`
- `/analytics/admin/usage/`: `users`, `weekly-activity`, `sessions` (by `total|platform|appVersion`), `feature-usage`
- `/analytics/admin/learning/`: `dimension-levels`, `dimension-focus`, `dimension-level-ups`, `quest-progress`, `mission-progress`, `challenge-progress` (by `item|level|dimension`), `quiz-results`, `food-facts-read` (by `item|topic|level|dimension`), `badges`, `badge-earns`, `xp-distribution`, `xp-sources` (by `sourceType|dimension`)

Deviations from the plan:

- Time range is `weeks` (as the old usage routes), not `from`/`to`/`interval`. `meta.from`/`meta.to` are filled for time series.
- Usage overview + breakdown became one insight `users`; trend + trend/breakdown became `weekly-activity`. Old `/analytics/usage/*` routes removed (no aliases); the UI usage page (`app/api/usage/[...path]/route.ts`, `lib/usage-api.ts`) must move to `/analytics/admin/usage/*`.
- "Active" (`shared/sql.ts` `CLIENT_EVENT_SQL`) = any event except source `seed`, wallet/badge/indicator/level-up events and rule-engine events. Admin requests write no events, so they drop out of new usage numbers; admin accounts themselves are not excluded (no admin flag in the DB, Q3).
- Group-size rule applies when a breakdown is set or the rollup selects a `userGroupColumns` column (`sessions` by `platform`/`appVersion`); the row's population value is used (`usersValue`, e.g. `totalUsers` for `weekly-activity`). Complementary suppression on top (`shared/privacy.ts`). NULL group values (missing event metadata) come back as `null`.
- Labels: rows carry codes; the catalog returns English labels for every code (dimensions, topics, quests, missions, challenges, quizzes, food facts, badges), ~38 KB.
- Q1 taken as proposed (both `dimension-focus` and `dimension-levels`).
