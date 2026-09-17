import { RulesService } from './rules.service';

describe('RulesService filterEvents', () => {
  const service = new RulesService({} as never);

  it('filters LEARNING_FACT_READ by metadata.foodFactId', () => {
    const evaluationAt = new Date('2026-01-04T00:00:00.000Z');
    const filtered = (service as any).filterEvents(
      {
        event: 'LEARNING_FACT_READ',
        where: {
          'metadata.foodFactId': 'fact-2',
        },
      },
      [
        {
          eventType: 'LEARNING_FACT_READ',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          metadata: { foodFactId: 'fact-1' },
        },
        {
          eventType: 'LEARNING_FACT_READ',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          metadata: { foodFactId: 'fact-2' },
        },
        {
          eventType: 'LEARNING_RECIPE_SHARED',
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
          metadata: { foodFactId: 'fact-2' },
        },
      ],
      { type: 'since_start', days: 7 },
      evaluationAt,
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].metadata).toEqual({ foodFactId: 'fact-2' });
  });

  it('applies where filtering before distinctBy dedupe', () => {
    const evaluationAt = new Date('2026-01-04T00:00:00.000Z');
    const filtered = (service as any).filterEvents(
      {
        event: 'LEARNING_FACT_READ',
        where: {
          'metadata.foodFactId': 'fact-7',
        },
        distinctBy: 'metadata.foodFactId',
      },
      [
        {
          eventType: 'LEARNING_FACT_READ',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          metadata: { foodFactId: 'fact-7' },
        },
        {
          eventType: 'LEARNING_FACT_READ',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          metadata: { foodFactId: 'fact-7' },
        },
        {
          eventType: 'LEARNING_FACT_READ',
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
          metadata: { foodFactId: 'fact-8' },
        },
      ],
      { type: 'since_start', days: 7 },
      evaluationAt,
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].metadata).toEqual({ foodFactId: 'fact-7' });
  });

  it('evaluates current and previous rolling windows independently', () => {
    const now = new Date('2026-09-17T12:00:00.000Z');
    const evaluated = (service as any).evaluateRule(
      {
        window: { type: 'rolling_lookback', days: 7 },
        counters: {
          currentMeatMeals: {
            event: 'MEAL_MEAT_CONSUMED',
            distinctBy: 'metadata.mealId',
          },
          previousMeatMeals: {
            event: 'MEAL_MEAT_CONSUMED',
            distinctBy: 'metadata.mealId',
            window: {
              type: 'rolling_lookback',
              days: 7,
              offsetDays: 7,
            },
          },
        },
        target:
          'previousMeatMeals >= 1 && currentMeatMeals <= previousMeatMeals - 1',
        progress:
          'previousMeatMeals > 0 ? clamp((previousMeatMeals - currentMeatMeals) / previousMeatMeals, 0, 1) : 0',
        notes: ['test'],
      },
      [
        {
          eventType: 'MEAL_MEAT_CONSUMED',
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          metadata: { mealId: 'meal-current-1' },
        },
        {
          eventType: 'MEAL_MEAT_CONSUMED',
          createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
          metadata: { mealId: 'meal-previous-1' },
        },
        {
          eventType: 'MEAL_MEAT_CONSUMED',
          createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          metadata: { mealId: 'meal-previous-2' },
        },
      ],
    );

    expect(evaluated).toEqual({ progress: 100, completed: true });
  });
});
