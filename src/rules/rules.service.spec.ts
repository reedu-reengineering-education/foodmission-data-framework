import { evaluateRule, filterEvents } from './rule-evaluator';

describe('rule-evaluator filterEvents', () => {
  it('filters LEARNING_FACT_READ by metadata.foodFactId', () => {
    const evaluationAt = new Date('2026-01-04T00:00:00.000Z');
    const filtered = filterEvents(
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
    const filtered = filterEvents(
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
    const evaluated = evaluateRule(
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
      now,
    );

    expect(evaluated).toEqual({
      progress: 100,
      completed: true,
      failed: false,
      deadline: null,
      counters: { currentMeatMeals: 1, previousMeatMeals: 2 },
    });
  });
});

describe('rule-evaluator since_start windows anchored at startedAt', () => {
  const day = 24 * 60 * 60 * 1000;
  const startedAt = new Date('2026-09-10T08:00:00.000Z');
  const at = (days: number) => new Date(startedAt.getTime() + days * day);
  const legumeMeal = (days: number, mealLogId: string) => ({
    eventType: 'MEAL_LEGUME_CONSUMED',
    createdAt: at(days),
    metadata: { mealLogId },
  });
  const countRule = {
    window: { type: 'since_start' as const, days: 7 },
    counters: {
      legumeMeals: {
        event: 'MEAL_LEGUME_CONSUMED',
        distinctBy: 'metadata.mealLogId',
      },
    },
    target: 'legumeMeals >= 3',
    progress: 'min(legumeMeals / 3, 1)',
    notes: ['test'],
  };
  const meatCapRule = {
    window: { type: 'since_start' as const, days: 7 },
    counters: { meatMeals: { event: 'MEAL_MEAT_CONSUMED' } },
    target: 'meatMeals <= 3',
    fail: 'meatMeals > 3',
    progress: 'max(0, min(1 - (meatMeals / 4), 1))',
    notes: ['test'],
  };
  const meatMeals = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      eventType: 'MEAL_MEAT_CONSUMED',
      createdAt: at(1 + i * 0.1),
      metadata: {},
    }));

  it('ignores events before startedAt and computes the deadline', () => {
    const outcome = evaluateRule(
      countRule,
      [legumeMeal(-1, 'before'), legumeMeal(1, 'a'), legumeMeal(2, 'b')],
      at(3),
      startedAt,
    );

    expect(outcome.counters.legumeMeals).toBe(2);
    expect(outcome.deadline).toEqual(at(7));
    expect(outcome.completed).toBe(false);
    expect(outcome.failed).toBe(false);
  });

  it('ignores events after the window ends', () => {
    const outcome = evaluateRule(
      countRule,
      [legumeMeal(1, 'a'), legumeMeal(2, 'b'), legumeMeal(8, 'late')],
      at(9),
      startedAt,
    );

    expect(outcome.counters.legumeMeals).toBe(2);
  });

  it('completes as soon as the target holds inside the window', () => {
    const outcome = evaluateRule(
      countRule,
      [legumeMeal(1, 'a'), legumeMeal(2, 'b'), legumeMeal(3, 'c')],
      at(3.5),
      startedAt,
    );

    expect(outcome).toEqual(
      expect.objectContaining({
        completed: true,
        failed: false,
        progress: 100,
      }),
    );
  });

  it('fails when the window ends without the target', () => {
    const outcome = evaluateRule(
      countRule,
      [legumeMeal(1, 'a')],
      at(7),
      startedAt,
    );

    expect(outcome).toEqual(
      expect.objectContaining({ completed: false, failed: true }),
    );
  });

  it('fails at once on a fail expression without resolveAt window_end', () => {
    const outcome = evaluateRule(meatCapRule, meatMeals(4), at(2), startedAt);

    expect(outcome).toEqual(
      expect.objectContaining({ completed: false, failed: true }),
    );
  });

  it('holds both verdicts until the window end with resolveAt window_end', () => {
    const rule = { ...meatCapRule, resolveAt: 'window_end' as const };

    const early = evaluateRule(rule, meatMeals(2), at(2), startedAt);
    expect(early).toEqual(
      expect.objectContaining({ completed: false, failed: false }),
    );

    const tooMuchEarly = evaluateRule(rule, meatMeals(4), at(2), startedAt);
    expect(tooMuchEarly.failed).toBe(false);

    expect(evaluateRule(rule, meatMeals(2), at(7), startedAt).completed).toBe(
      true,
    );
    expect(evaluateRule(rule, meatMeals(4), at(7), startedAt).failed).toBe(
      true,
    );
  });

  it('keeps the old rolling behaviour without startedAt', () => {
    const now = at(20);
    const outcome = evaluateRule(
      countRule,
      [legumeMeal(18, 'a'), legumeMeal(19, 'b'), legumeMeal(19.5, 'c')],
      now,
    );

    expect(outcome).toEqual(
      expect.objectContaining({
        completed: true,
        failed: false,
        deadline: null,
      }),
    );
  });
});
