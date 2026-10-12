import {
  countGroups,
  evaluateCounters,
  filterEvents,
  type RuleCounter,
  type UserEventRow,
} from './rule-evaluator';

const evaluationAt = new Date('2026-01-08T00:00:00.000Z');
const window = { type: 'since_start' as const, days: 7 };

function event(
  eventType: string,
  metadata: Record<string, unknown>,
  createdAt = '2026-01-05T12:00:00.000Z',
): UserEventRow {
  return {
    eventType,
    createdAt: new Date(createdAt),
    metadata: metadata as UserEventRow['metadata'],
  };
}

function count(counter: RuleCounter, events: UserEventRow[]): number {
  return evaluateCounters({ c: counter }, events, window, evaluationAt).c;
}

describe('rule-evaluator groupBy', () => {
  const facts: RuleCounter = {
    anyOf: [
      'SHOPPING_ORIGIN_CHECKED',
      'SHOPPING_CERTIFICATION_CHOSEN',
      'SHOPPING_SEASONAL_CHOSEN',
    ],
    groupBy: { key: 'metadata.productId', minDistinct: 2 },
  };

  it('counts items with enough distinct event types', () => {
    expect(
      count(facts, [
        // p1: two different facts
        event('SHOPPING_ORIGIN_CHECKED', { productId: 'p1' }),
        event('SHOPPING_SEASONAL_CHOSEN', { productId: 'p1' }),
        // p2: the same fact twice
        event('SHOPPING_ORIGIN_CHECKED', { productId: 'p2' }),
        event('SHOPPING_ORIGIN_CHECKED', { productId: 'p2' }),
        // p3: three facts
        event('SHOPPING_ORIGIN_CHECKED', { productId: 'p3' }),
        event('SHOPPING_SEASONAL_CHOSEN', { productId: 'p3' }),
        event('SHOPPING_CERTIFICATION_CHOSEN', { productId: 'p3' }),
      ]),
    ).toBe(2);
  });

  it('drops events without the item key', () => {
    expect(
      count(facts, [
        event('SHOPPING_ORIGIN_CHECKED', {}),
        event('SHOPPING_SEASONAL_CHOSEN', {}),
        event('SHOPPING_ORIGIN_CHECKED', { productId: { nested: true } }),
        event('SHOPPING_SEASONAL_CHOSEN', { productId: { nested: true } }),
      ]),
    ).toBe(0);
  });

  it('requires the listed event types in every counted item', () => {
    const counter: RuleCounter = {
      ...facts,
      groupBy: { ...facts.groupBy!, require: ['SHOPPING_ORIGIN_CHECKED'] },
    };
    expect(
      count(counter, [
        event('SHOPPING_SEASONAL_CHOSEN', { productId: 'p1' }),
        event('SHOPPING_CERTIFICATION_CHOSEN', { productId: 'p1' }),
        event('SHOPPING_ORIGIN_CHECKED', { productId: 'p2' }),
        event('SHOPPING_CERTIFICATION_CHOSEN', { productId: 'p2' }),
      ]),
    ).toBe(1);
  });

  it('applies the window to each event before grouping', () => {
    expect(
      evaluateCounters(
        { c: facts },
        [
          event(
            'SHOPPING_ORIGIN_CHECKED',
            { productId: 'p1' },
            '2025-12-20T00:00:00.000Z',
          ),
          event('SHOPPING_SEASONAL_CHOSEN', { productId: 'p1' }),
        ],
        window,
        evaluationAt,
        new Date('2026-01-01T00:00:00.000Z'),
      ).c,
    ).toBe(0);
  });

  describe('of / values (colours per day)', () => {
    const colours: RuleCounter = {
      event: 'NUTRITION_RAINBOW_COLOURS_LOGGED',
      groupBy: {
        key: 'metadata.dayBucket',
        of: 'metadata.colours',
        values: ['GREEN', 'RED', 'ORANGE', 'YELLOW', 'PURPLE', 'WHITE'],
        minDistinct: 5,
      },
    };
    const rainbow = (dayBucket: string, values: unknown) =>
      event('NUTRITION_RAINBOW_COLOURS_LOGGED', {
        dayBucket,
        colours: values,
      });

    it('merges array values across events of the same day', () => {
      expect(
        count(colours, [
          rainbow('2026-01-05', ['GREEN', 'RED']),
          rainbow('2026-01-05', ['red', 'orange', 'YELLOW']),
          rainbow('2026-01-05', ['PURPLE']),
          // Only four colours on this day.
          rainbow('2026-01-06', ['GREEN', 'RED', 'ORANGE', 'YELLOW']),
        ]),
      ).toBe(1);
    });

    it('ignores repeats, values outside the list and non-arrays', () => {
      expect(
        count(colours, [
          rainbow('2026-01-05', ['GREEN', 'GREEN', 'BLUE', 'BROWN', 'RED']),
          rainbow('2026-01-05', 'ORANGE'),
          rainbow('2026-01-05', [{ colour: 'YELLOW' }, 42]),
          rainbow('2026-01-05', null),
        ]),
      ).toBe(0);
    });
  });

  it('countGroups needs no counter around it', () => {
    expect(
      countGroups(
        [
          event('A', { id: '1' }),
          event('B', { id: '1' }),
          event('A', { id: '2' }),
        ],
        { key: 'metadata.id', minDistinct: 1 },
      ),
    ).toBe(2);
  });
});

describe('rule-evaluator where with an array', () => {
  it('matches any of the listed values', () => {
    const filtered = filterEvents(
      {
        event: 'MEAL_LOGGED',
        where: { 'metadata.mealType': ['BREAKFAST', 'LUNCH', 'DINNER'] },
      },
      [
        event('MEAL_LOGGED', { mealType: 'BREAKFAST' }),
        event('MEAL_LOGGED', { mealType: 'DINNER' }),
        event('MEAL_LOGGED', { mealType: 'SNACK' }),
        event('MEAL_LOGGED', {}),
      ],
      window,
      evaluationAt,
    );
    expect(filtered.map((e) => e.metadata)).toEqual([
      { mealType: 'BREAKFAST' },
      { mealType: 'DINNER' },
    ]);
  });
});
