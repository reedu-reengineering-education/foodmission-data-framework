instructions:

## Meal Log Analytics

1. Run normal seed for DB

```
npm run db:seed
```

2. Run meal log seed

```
npm run db:seed:meal-logs
```

3. Log in as admin and generate a batch:

```
{{baseUrl}}/api/v1/analytics/meal-log/batches/generate?periodStart=2026-04-18&periodEnd=2026-04-25
```

Use a date range that matches your seeded meal-log data.

4. check your DB for new generated AnalyticsBatch (prisma studio)

5. Approve the generated batch:

```
{{baseUrl}}/api/v1/analytics/meal-log/batches/:id/approve
```

6. Publish the approved batch:

```
{{baseUrl}}/api/v1/analytics/meal-log/batches/:id/publish
```

7. Data is available through public routes only after publish, for example:

```
{{baseUrl}}/api/v1/analytics/meal-log/public/nutrition
```

---

## Shopping List Analytics

1. Run normal seed for DB (if not already done)

```
npm run db:seed
```

2. Run shopping list seed (seeds ~7 days of lists for all users)

```
npm run db:seed:shopping-lists
```

The script prints a suggested `periodStart`/`periodEnd` range at the end — use those values in step 3.

3. Log in as admin and generate a batch:

```
{{baseUrl}}/api/v1/analytics/shopping-list/batches/generate?periodStart=2026-05-09&periodEnd=2026-05-16
```

4. Check your DB for the new batch (prisma studio)

5. Approve the generated batch:

```
{{baseUrl}}/api/v1/analytics/shopping-list/batches/:id/approve
```

6. Publish the approved batch:

```
{{baseUrl}}/api/v1/analytics/shopping-list/batches/:id/publish
```

7. Data is available through public routes only after publish, for example:

```
{{baseUrl}}/api/v1/analytics/shopping-list/public/summary
{{baseUrl}}/api/v1/analytics/shopping-list/public/item-popularity
{{baseUrl}}/api/v1/analytics/shopping-list/public/category-popularity
{{baseUrl}}/api/v1/analytics/shopping-list/public/list-patterns
{{baseUrl}}/api/v1/analytics/shopping-list/public/sustainability
{{baseUrl}}/api/v1/analytics/shopping-list/public/classification
{{baseUrl}}/api/v1/analytics/shopping-list/public/food-groups
{{baseUrl}}/api/v1/analytics/shopping-list/public/demographic/patterns
{{baseUrl}}/api/v1/analytics/shopping-list/public/demographic/classification
{{baseUrl}}/api/v1/analytics/shopping-list/public/cross-dim/patterns
{{baseUrl}}/api/v1/analytics/shopping-list/public/cross-dim/classification
```

Shopping List analytics intentionally does not expose nutrition or per-100g nutritional density routes. Meal Log is the source of truth for consumed nutrition analytics; Shopping List covers planned item popularity, patterns, sustainability, and classification.

**K-anonymity thresholds:** single-dimension aggregates require ≥5 unique users; cross-dimensional aggregates require ≥20 unique users. Groups below threshold are suppressed.

**Cleanup:**

```
npm run db:clean:shopping-lists
```
