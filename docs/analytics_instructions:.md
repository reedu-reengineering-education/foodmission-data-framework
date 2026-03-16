instructions:

1. Run normal seed for DB

```
npm run db:seed
```

2. Run meal log seed

```
npm run db:seeed:meal-logs
```

3. Log in as admin. Trigger route /api/v1/analytics/batches/generate

4. check your DB for new generated AnalyticsBatch (prisma studio)

5. Set new Batch to "published". Data will be available through public routes after that
