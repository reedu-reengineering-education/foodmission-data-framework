import { Unit } from '@prisma/client';

export interface PantryItemFilter {
  pantryId?: string;
  foodProductId?: string;
  genericFoodId?: string;
  unit?: Unit;
  expiryDate?: Date;
}
