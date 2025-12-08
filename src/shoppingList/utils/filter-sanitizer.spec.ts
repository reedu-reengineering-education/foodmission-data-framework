import { sanitizeShoppingListItemFilters } from './filter-sanitizer';
import { QueryShoppingListItemDto } from '../../shoppingListItem/dto/query-soppingListItem.dto';
import { Unit } from '@prisma/client';

describe('sanitizeShoppingListItemFilters', () => {
  it('should return undefined filters when query is not provided', () => {
    const result = sanitizeShoppingListItemFilters();
    expect(result).toEqual({
      foodId: undefined,
      checked: undefined,
      unit: undefined,
    });
  });

  it('should trim foodId and drop empty strings', () => {
    const query = { foodId: '  food-1  ' } as QueryShoppingListItemDto;
    const result = sanitizeShoppingListItemFilters(query);
    expect(result.foodId).toBe('food-1');

    const emptyQuery = { foodId: '   ' } as QueryShoppingListItemDto;
    const emptyResult = sanitizeShoppingListItemFilters(emptyQuery);
    expect(emptyResult.foodId).toBeUndefined();
  });

  it('should drop checked when nullish or empty string', () => {
    expect(
      sanitizeShoppingListItemFilters({ checked: undefined } as any).checked,
    ).toBeUndefined();
    expect(
      sanitizeShoppingListItemFilters({ checked: null } as any).checked,
    ).toBeUndefined();
    expect(
      sanitizeShoppingListItemFilters({ checked: '' as any } as any).checked,
    ).toBeUndefined();
  });

  it('should keep checked boolean values', () => {
    expect(
      sanitizeShoppingListItemFilters({ checked: true } as any).checked,
    ).toBe(true);
    expect(
      sanitizeShoppingListItemFilters({ checked: false } as any).checked,
    ).toBe(false);
  });

  it('should pass through unit', () => {
    const result = sanitizeShoppingListItemFilters({ unit: Unit.KG } as any);
    expect(result.unit).toBe(Unit.KG);
  });
});
