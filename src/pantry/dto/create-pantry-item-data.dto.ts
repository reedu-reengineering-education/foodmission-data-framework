import { Unit } from '@prisma/client';

export interface CreatePantryItemData {
  pantryId: string;
  foodProductId?: string | null;
  genericFoodId?: string | null;
  itemType: string;
  quantity: number;
  unit: Unit;
  notes?: string;
  location?: string;
  expiryDate?: Date;
  expiryDateSource?: 'manual' | 'auto_foodkeeper';
}
