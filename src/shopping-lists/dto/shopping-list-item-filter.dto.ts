import { Unit } from '@prisma/client';

export interface ShoppingListItemFilter {
  shoppingListId?: string;
  foodProductId?: string;
  genericFoodId?: string;
  checked?: boolean;
  unit?: Unit;
  userId?: string;
}
