# Meal-Log anonymization & aggregation for testing

1. run all the seeds normally (you shoudl have ~400 users, ~20 foods and 2000 nevo categories)
2. after that run the "seed-meal-log.ts" 
```
npx tsx scripts/seed-meal-logs.ts
```

It should create 3 meals a day for 7 days for all 400 users.

3. Generate a meal-log-batch for the generated data by calling following url with an admin account:

```
{{baseUrl}}/api/v1/analytics/meal-log/batches/generate?periodStart=2026-04-18&periodEnd=2026-04-25
```

Change start/end-dates according to your generated batches (today - 6 days)

4. Approve the generated batch:

```
{{baseUrl}}/api/v1/analytics/meal-log/batches/:id/approve
```

5. Publish the approved batch so the data is published in the public api endpoints

```
{{baseUrl}}/api/v1/analytics/meal-log/batches/:id/publish
```

6. Test the data by checking out the foodmission-data-ui (currently branch: "feat/analyticsData")

7. There are 2 clean-scripts if you want to delete the data easily while testing: 'clean-analytics' to delete all the aggregated/anonymized data and 'clean-meal-logs' to clean the meal logs