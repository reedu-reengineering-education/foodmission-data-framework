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

  it('accepts before_start as a counter window but not as a rule window', () => {
    const missionWith = (
      ruleWindow: Record<string, unknown>,
      counterWindow: Record<string, unknown>,
    ) => ({
      ...BASE_DOC,
      missions: [
        {
          code: 'M.B1.3',
          shape: 'bounded_max_with_fail',
          rule: {
            window: ruleWindow,
            counters: {
              previous: {
                event: 'MEAL_MEAT_CONSUMED',
                window: counterWindow,
              },
            },
            target: 'previous >= 1',
            progress: 'min(previous, 1)',
            notes: ['test'],
          },
        },
      ],
      challenges: [{ code: 'CH.B1.1', shape: 'undecided' }],
    });
    const validate = (doc: unknown) =>
      rulesCoverageSchema.validate(doc, { abortEarly: false }).error;

    expect(
      validate(
        missionWith(
          { type: 'since_start', days: 7 },
          { type: 'before_start', days: 7 },
        ),
      ),
    ).toBeUndefined();
    expect(
      validate(
        missionWith(
          { type: 'before_start', days: 7 },
          { type: 'since_start', days: 7 },
        ),
      ),
    ).toBeDefined();
  });
});

describe('rulesCoverageSchema expression identifiers', () => {
  function docWith(rule: Record<string, unknown>) {
    return {
      ...BASE_DOC,
      missions: [
        {
          code: 'M.B1.1',
          shape: 'composite_threshold',
          rule: {
            window: { type: 'since_start', days: 7 },
            counters: {
              reads: { event: 'LEARNING_FACT_READ' },
              quizzes: { event: 'QUIZ_ANSWERED' },
            },
            target: 'reads >= 1 && quizzes >= 1',
            progress: 'min((reads + quizzes) / 2, 1)',
            notes: ['test'],
            ...rule,
          },
        },
      ],
      challenges: [{ code: 'CH.B1.1', shape: 'undecided' }],
    };
  }

  function validate(rule: Record<string, unknown>) {
    return rulesCoverageSchema.validate(docWith(rule), {
      abortEarly: false,
      allowUnknown: false,
    });
  }

  it('accepts expressions that only name counters and builtins', () => {
    expect(
      validate({ fail: 'clamp(reads, 0, 1) > max(quizzes, 0) || false' }).error,
    ).toBeUndefined();
  });

  // The typo sits behind `&&`, which a zero-event run would never reach.
  it.each([
    ['target', 'reads >= 1 && quizzez >= 1'],
    ['progress', 'reads > 0 ? min(quizzez, 1) : 0'],
    ['fail', 'reads > 5 && quizzez > 5'],
  ])('rejects an unknown counter in %s', (field, expression) => {
    const { error } = validate({ [field]: expression });
    expect(error?.message).toContain('unknown counters: quizzez');
  });
});
