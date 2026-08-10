import {
  parseEntityTranslationKey,
  toEntityTranslationKey,
} from '../../../scripts/i18n/entity-translation-handoff';

describe('entity translation handoff keys', () => {
  it('builds GenericFood keys from nevoCode + field', () => {
    expect(toEntityTranslationKey('GenericFood', 1, 'foodName')).toBe(
      'GenericFood.1.foodName',
    );
    expect(toEntityTranslationKey('GenericFood', 2685, 'foodGroup')).toBe(
      'GenericFood.2685.foodGroup',
    );
  });

  it('builds learning catalog keys from business codes', () => {
    expect(toEntityTranslationKey('FoodFact', 'FF1.1.1', 'body')).toBe(
      'FoodFact.FF1.1.1.body',
    );
    expect(toEntityTranslationKey('Mission', 'M.A1.1', 'title')).toBe(
      'Mission.M.A1.1.title',
    );
    expect(toEntityTranslationKey('QuizOption', 'Q1.1.1:A', 'text')).toBe(
      'QuizOption.Q1.1.1:A.text',
    );
  });

  it('parses valid keys', () => {
    expect(parseEntityTranslationKey('GenericFood.1.foodName')).toEqual({
      entityType: 'GenericFood',
      naturalKey: '1',
      field: 'foodName',
    });
    expect(parseEntityTranslationKey('FoodFact.FF1.1.1.body')).toEqual({
      entityType: 'FoodFact',
      naturalKey: 'FF1.1.1',
      field: 'body',
    });
    expect(parseEntityTranslationKey('Mission.M.A1.1.whyItMatters')).toEqual({
      entityType: 'Mission',
      naturalKey: 'M.A1.1',
      field: 'whyItMatters',
    });
    expect(parseEntityTranslationKey('QuizOption.Q1.1.1:A.text')).toEqual({
      entityType: 'QuizOption',
      naturalKey: 'Q1.1.1:A',
      field: 'text',
    });
  });

  it('rejects invalid keys', () => {
    expect(parseEntityTranslationKey('GenericFood.1')).toBeUndefined();
    expect(parseEntityTranslationKey('GenericFood.1.title')).toBeUndefined();
    expect(parseEntityTranslationKey('Unknown.1.foodName')).toBeUndefined();
    expect(parseEntityTranslationKey('')).toBeUndefined();
  });
});
