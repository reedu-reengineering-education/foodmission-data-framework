import { QueryShoppingListItemDto } from '../dto/query-shopping-list-item.dto';
import { Unit } from '@prisma/client';

export type SanitizedShoppingListItemFilters = {
  foodProductId?: string;
  genericFoodId?: string;
  checked?: boolean;
  unit?: Unit;
};

/**
 * Normalizes shopping list item filters across services.
 * - Trims foodProductId and genericFoodId and drops empty strings.
 * - Keeps checked as boolean when provided; drops null/undefined/''.
 * - Passes through unit.
 */
export function sanitizeShoppingListItemFilters(
  query?: QueryShoppingListItemDto,
): SanitizedShoppingListItemFilters {
  if (!query) {
    return {
      foodProductId: undefined,
      genericFoodId: undefined,
      checked: undefined,
      unit: undefined,
    };
  }

  const trimmedFoodProductId = query.foodProductId?.trim();
  const foodProductId = trimmedFoodProductId ? trimmedFoodProductId : undefined;
  const trimmedGenericFoodId = query.genericFoodId?.trim();
  const genericFoodId = trimmedGenericFoodId ? trimmedGenericFoodId : undefined;
  const unit = query.unit || undefined;

  let checked = query.checked;
  if (checked === undefined || checked === null || checked === ('' as any)) {
    checked = undefined;
  }

  return { foodProductId, genericFoodId, checked, unit };
}
