# Data Anonymization Process

## Overview

FOODMISSION uses a **batch-aggregation pipeline with k-anonymity** to transform
individual user data into anonymous, publicly accessible analytics. No individual
user data ever leaves the system — only statistical aggregates that are guaranteed
to represent groups of ≥ K users.

---

## Process Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRIVATE DATA (never exposed)                        │
│                                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Users    │  │  Meals   │  │ MealLogs │  │  Foods   │  │ FoodCat.   │  │
│  │──────────│  │──────────│  │──────────│  │──────────│  │ (NEVO)     │  │
│  │ keycloak │  │ name     │  │ userId   │  │ name     │  │──────────  │  │
│  │ email    │  │ items[]  │  │ mealId   │  │ kcal     │  │ foodName   │  │
│  │ yearBirth│  │ sustain. │  │ mealType │  │ proteins │  │ foodGroup  │  │
│  │ gender   │  │ score    │  │ timestamp│  │ fat/carbs│  │ kcal/prot  │  │
│  │ eduLevel │  │          │  │ fromPantr│  │ nutri/eco│  │ fat/carbs  │  │
│  │ region   │  │          │  │ eatenOut │  │ nova/veg │  │            │  │
│  │ country  │  │          │  │          │  │ carbon   │  │            │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                                            │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
          ┌────────────────────────────────────────────────┐
          │         STEP 1: RAW DATA FETCH (SQL JOIN)      │
          │────────────────────────────────────────────────│
          │                                                │
          │  meal_logs ──┬── Meal ──── MealItems           │
          │              │             ├── Food (OFF)      │
          │              │             └── FoodCategory    │
          │              └── User (demographics)           │
          │                                                │
          │  Filters by date range (periodStart → End)     │
          │  Demographics derived at query time:           │
          │  • yearOfBirth → age bracket (18-24, 25-34…)   │
          │  • gender, educationLevel, region, country     │
          │                                                │
          │  Output: RawMealRow[] (one row per meal×item)  │
          └────────────────────┬───────────────────────────┘
                               │
                               ▼
          ┌────────────────────────────────────────────────┐
          │     STEP 2: PER-MEAL AGGREGATION               │
          │────────────────────────────────────────────────│
          │                                                │
          │  Group rows by mealLogId → MealAggregate       │
          │                                                │
          │  For each meal, compute:                        │
          │  • Sum: calories, proteins, fat, carbs, fiber,│
          │         sodium, sugar, saturatedFat, carbon    │
          │  • Flags: isVegetarian, isVegan                │
          │  • Lists: novaGroups[], nutriScoreGrades[],    │
          │           ecoScoreGrades[], foods[]            │
          │  • Context: userId, mealType, timestamp,       │
          │    weeksSinceRegistration, demographic dims    │
          │                                                │
          │  ⚠ userId is kept here but NEVER stored       │
          │    in output tables — only used for counting   │
          │                                                │
          │  Output: MealAggregate[] (one per meal)         │
          └────────────────────┬───────────────────────────┘
                               │
                               ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │              STEP 3: STATISTICAL AGGREGATION (12 tables)              │
  │────────────────────────────────────────────────────────────────────────│
  │                                                                        │
  │  Group meals by date × typeOfMeal (× demographic dimension)            │
  │  Compute ONLY statistical summaries — no individual data:              │
  │                                                                        │
  │  ┌──────────────────────┐  ┌──────────────────────┐                    │
  │  │ Standard (6 tables)  │  │ Single-dim (3 tables)│                    │
  │  │ Group: date × meal   │  │ + ageGroup OR gender │                    │
  │  │───────────────────── │  │   OR edu OR region   │                    │
  │  │ DailyNutrition       │  │   OR country         │                    │
  │  │ FoodPopularity       │  │──────────────────────│                    │
  │  │ MealPatterns         │  │ DemographicNutrition │                    │
  │  │ Sustainability       │  │ DemographicClassific.│                    │
  │  │ MealClassification   │  │ DemographicPatterns  │                    │
  │  │ MealRecords          │  │                      │                    │
  │  └──────────────────────┘  └──────────────────────┘                    │
  │                                                                        │
  │  ┌──────────────────────┐  Each row stores:                            │
  │  │ Cross-dim (3 tables) │  • userCount (unique users in group)         │
  │  │ + dim1 × dim2        │  • Averages, percentiles, percentages        │
  │  │ (e.g. gender×country)│  • Distributions (JSON)                      │
  │  │──────────────────────│                                              │
  │  │ CrossDimNutrition    │  ❌ NO userId, email, name, or any PII       │
  │  │ CrossDimClassific.   │  ❌ NO individual meal or food records        │
  │  │ CrossDimPatterns     │                                              │
  │  └──────────────────────┘                                              │
  └────────────────────────────┬───────────────────────────────────────────┘
                               │
                               ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │            STEP 4: K-ANONYMITY SUPPRESSION                            │
  │────────────────────────────────────────────────────────────────────────│
  │                                                                        │
  │  For each aggregated row, check:                                       │
  │                                                                        │
  │  ┌─────────────────────────────────────────────────────────┐           │
  │  │  Standard + Single-dimension tables:                     │           │
  │  │                                                          │           │
  │  │    userCount < K (K=5) ?  ──── YES ──→ ❌ SUPPRESS ROW  │           │
  │  │         │                                                │           │
  │  │         NO                                               │           │
  │  │         ▼                                                │           │
  │  │    ✅ KEEP ROW                                           │           │
  │  └─────────────────────────────────────────────────────────┘           │
  │                                                                        │
  │  ┌─────────────────────────────────────────────────────────┐           │
  │  │  Cross-dimensional tables (stricter):                    │           │
  │  │                                                          │           │
  │  │    userCount < K (K=20) ?  ──── YES ──→ ❌ SUPPRESS ROW │           │
  │  │         │                                                │           │
  │  │         NO                                               │           │
  │  │         ▼                                                │           │
  │  │    ✅ KEEP ROW                                           │           │
  │  └─────────────────────────────────────────────────────────┘           │
  │                                                                        │
  │  Suppressed rows are counted but NEVER stored or exposed.              │
  │  This ensures no group can be narrowed to fewer than K people.         │
  │                                                                        │
  │  Example: If only 3 users from Malta logged BREAKFAST,                 │
  │  that row is suppressed — an attacker cannot infer those               │
  │  3 individuals' dietary habits.                                        │
  │                                                                        │
  │  Cross-dim uses K=20 because combining two dimensions                  │
  │  (e.g. "female + Malta") creates smaller subgroups                     │
  │  with higher re-identification risk.                                   │
  └────────────────────────────┬───────────────────────────────────────────┘
                               │
                               ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │        STEP 5: BATCH LIFECYCLE (human-in-the-loop review)             │
  │────────────────────────────────────────────────────────────────────────│
  │                                                                        │
  │                      ┌──────────────┐                                  │
  │   CRON (daily 2AM)   │   STAGING    │  Batch auto-generated            │
  │   or manual trigger──│              │  with k-anonymity applied        │
  │                      └──────┬───────┘                                  │
  │                             │                                          │
  │                    Admin reviews batch                                 │
  │                    (record count, suppressed groups, metadata)          │
  │                             │                                          │
  │                 ┌───────────┴───────────┐                              │
  │                 ▼                       ▼                              │
  │          ┌──────────┐           ┌──────────┐                           │
  │          │ APPROVED │           │ REJECTED │  Reason logged             │
  │          └────┬─────┘           └──────────┘  Batch can be deleted     │
  │               │                                                        │
  │          Admin publishes                                               │
  │               │                                                        │
  │               ▼                                                        │
  │          ┌──────────┐                                                  │
  │          │PUBLISHED │  publishedAt, publishedBy recorded               │
  │          └────┬─────┘                                                  │
  │               │                                                        │
  └───────────────┼────────────────────────────────────────────────────────┘
                  │
                  ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │        STEP 6: PUBLIC API (no auth required)                          │
  │────────────────────────────────────────────────────────────────────────│
  │                                                                        │
  │  Only rows from PUBLISHED batches are served.                          │
  │  All endpoints decorated with @Public() — no JWT needed.               │
  │                                                                        │
  │  GET /analytics/public/nutrition                                       │
  │  GET /analytics/public/food-popularity                                 │
  │  GET /analytics/public/meal-patterns                                   │
  │  GET /analytics/public/sustainability                                  │
  │  GET /analytics/public/meal-classification                             │
  │  GET /analytics/public/meal-records                                    │
  │  GET /analytics/public/demographic/nutrition?dimension=country         │
  │  GET /analytics/public/demographic/classification?dimension=gender     │
  │  GET /analytics/public/demographic/patterns?dimension=ageGroup         │
  │  GET /analytics/public/cross-dim/nutrition?dim1=gender&dim2=country    │
  │  GET /analytics/public/cross-dim/classification                        │
  │  GET /analytics/public/cross-dim/patterns                              │
  │  GET /analytics/public/summary                                         │
  │                                                                        │
  │  Every response row contains ONLY:                                     │
  │  ✅ Statistical aggregates (averages, percentiles, counts)             │
  │  ✅ Group labels (date, mealType, demographic category)                │
  │  ✅ userCount (always ≥ K)                                             │
  │  ❌ No PII, no userId, no email, no individual records                 │
  │                                                                        │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## Privacy Guarantees

| Protection Layer          | Mechanism                              | Effect                                                      |
| ------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| **No PII in output**      | Only aggregates stored in output       | userId, email, name never leave the private DB tables        |
| **Age generalization**    | `yearOfBirth` → age bracket            | Exact age never exposed; only categories like `25_34`        |
| **k-Anonymity (K=5)**     | Groups with < 5 users suppressed       | Cannot narrow to fewer than 5 individuals                   |
| **k-Anonymity (K=20)**    | Cross-dim groups with < 20 suppressed  | Two-factor intersections have stricter minimum               |
| **Batch review**          | STAGING → APPROVED → PUBLISHED         | Human admin must approve before any data is publicly visible |
| **Statistical only**      | Averages, percentiles, distributions   | Individual values hidden behind group statistics             |
| **Temporal aggregation**  | Grouped by date (day-level)            | Cannot pinpoint exact meal timestamps                        |

## k-Anonymity Explained

**k-anonymity** ensures every combination of quasi-identifiers (attributes that could
help identify someone) appears for at least K distinct individuals.

In FOODMISSION:
- **Quasi-identifiers**: date, mealType, ageGroup, gender, educationLevel, region, country
- **K=5** for single-dimension groupings (e.g., "all males who logged LUNCH on 2026-02-19")
- **K=20** for cross-dimensional groupings (e.g., "females aged 25-34 who logged DINNER")

If a group has fewer unique users than K, the entire row is **suppressed** (deleted
from the output). This prevents attackers from inferring information about small,
identifiable groups.
