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

  it('parses valid keys', () => {
    expect(parseEntityTranslationKey('GenericFood.1.foodName')).toEqual({
      entityType: 'GenericFood',
      naturalKey: '1',
      field: 'foodName',
    });
  });

  it('rejects invalid keys', () => {
    expect(parseEntityTranslationKey('GenericFood.1')).toBeUndefined();
    expect(parseEntityTranslationKey('GenericFood.1.title')).toBeUndefined();
    expect(parseEntityTranslationKey('Unknown.1.foodName')).toBeUndefined();
    expect(parseEntityTranslationKey('')).toBeUndefined();
  });
});
