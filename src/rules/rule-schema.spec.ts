import { rulesCoverageSchema } from './rule-schema';

const BASE_DOC = {
  schemaVersion: 1,
  status: 'draft',
  purpose: 'test',
  ruleTemplate: {
    window: { type: 'since_start', days: 7 },
    counters: {},
    target: 'reads >= 1',
    progress: 'min(reads, 1)',
    notes: ['template'],
  },
};

describe('rulesCoverageSchema counter.where', () => {
  it('accepts scalar metadata constraints', () => {
    const doc = {
      ...BASE_DOC,
      missions: [
        {
          code: 'M.B1.1',
          shape: 'one_shot_event',
          rule: {
            window: { type: 'since_start', days: 7 },
            counters: {
              reads: {
                event: 'LEARNING_FACT_READ',
                where: {
                  'metadata.foodFactId': 'fact-uuid-1',
                  'metadata.isImportant': true,
                },
              },
            },
            target: 'reads >= 1',
            progress: 'min(reads, 1)',
            notes: ['test'],
          },
        },
      ],
      challenges: [
        {
          code: 'CH.B1.1',
          shape: 'undecided',
        },
      ],
    };

    const { error } = rulesCoverageSchema.validate(doc, {
      abortEarly: false,
      allowUnknown: false,
    });

    expect(error).toBeUndefined();
  });

  it('rejects non-scalar where values', () => {
    const doc = {
      ...BASE_DOC,
      missions: [
        {
          code: 'M.B1.1',
          shape: 'one_shot_event',
          rule: {
            window: { type: 'since_start', days: 7 },
            counters: {
              reads: {
                event: 'LEARNING_FACT_READ',
                where: {
                  'metadata.foodFactId': { nested: 'not-allowed' },
                },
              },
            },
            target: 'reads >= 1',
            progress: 'min(reads, 1)',
            notes: ['test'],
          },
        },
      ],
      challenges: [
        {
          code: 'CH.B1.1',
          shape: 'undecided',
        },
      ],
    };

    const { error } = rulesCoverageSchema.validate(doc, {
      abortEarly: false,
      allowUnknown: false,
    });

    expect(error).toBeDefined();
  });

  it('accepts counter-specific rolling windows', () => {
    const doc = {
      ...BASE_DOC,
      missions: [
        {
          code: 'M.B1.3',
          shape: 'composite_threshold',
          rule: {
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
        },
      ],
      challenges: [
        {
          code: 'CH.B1.1',
          shape: 'undecided',
        },
      ],
    };

    const { error } = rulesCoverageSchema.validate(doc, {
      abortEarly: false,
      allowUnknown: false,
    });

    expect(error).toBeUndefined();
  });
});
