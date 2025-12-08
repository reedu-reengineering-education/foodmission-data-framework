import { QueryShoppingListItemDto } from '../../shoppingListItem/dto/query-soppingListItem.dto';
import { Unit } from '@prisma/client';

export type SanitizedShoppingListItemFilters = {
  foodId?: string;
  checked?: boolean;
  unit?: Unit;
};

/**
 * Normalizes shopping list item filters across services.
 * - Trims foodId and drops empty strings.
 * - Keeps checked as boolean when provided; drops null/undefined/''.
 * - Passes through unit.
 */
export function sanitizeShoppingListItemFilters(
  query?: QueryShoppingListItemDto,
): SanitizedShoppingListItemFilters {
  if (!query) {
    return { foodId: undefined, checked: undefined, unit: undefined };
  }

  const trimmedFoodId = query.foodId?.trim();
  const foodId = trimmedFoodId ? trimmedFoodId : undefined;
  const unit = query.unit || undefined;

  let checked = query.checked;
  if (checked === undefined || checked === null || checked === ('' as any)) {
    checked = undefined;
  }

  return { foodId, checked, unit };
}
