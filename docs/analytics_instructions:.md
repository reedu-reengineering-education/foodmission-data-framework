instructions:

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
{{baseUrl}}/api/v1/analytics/meallog/batches/generate?periodStart=2026-04-18&periodEnd=2026-04-25
```

Use a date range that matches your seeded meal-log data.

4. check your DB for new generated AnalyticsBatch (prisma studio)

5. Approve the generated batch:

```
{{baseUrl}}/api/v1/analytics/meallog/batches/:id/approve
```

6. Publish the approved batch:

```
{{baseUrl}}/api/v1/analytics/meallog/batches/:id/publish
```

7. Data is available through public routes only after publish, for example:

```
{{baseUrl}}/api/v1/analytics/meallog/public/nutrition
```
