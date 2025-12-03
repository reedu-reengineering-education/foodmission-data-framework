import { PantryItemResponseDto } from '../dto/response-pantryItem.dto';
import { CreatePantryItemDto } from '../dto/create-pantryItem.dto';
import { UpdatePantryItemDto } from '../dto/update-pantryItem.dto';
import { QueryPantryItemDto } from '../dto/query-pantryItem.dto';
import { Unit } from '@prisma/client';
import { TEST_IDS, TEST_DATA, TEST_DATES } from '../../common/test-utils/test-constants';

export class PantryItemTestBuilder {
  static createPantryItemResponseDto(
    overrides?: Partial<PantryItemResponseDto>,
  ): PantryItemResponseDto {
    return {
      id: TEST_IDS.PANTRY_ITEM,
      pantryId: TEST_IDS.PANTRY,
      foodId: TEST_IDS.FOOD,
      quantity: TEST_DATA.QUANTITY,
      unit: Unit.KG,
      notes: TEST_DATA.NOTES,
      expiryDate: TEST_DATES.EXPIRY,
      ...overrides,
    };
  }

  static createCreatePantryItemDto(
    overrides?: Partial<CreatePantryItemDto>,
  ): CreatePantryItemDto {
    return {
      pantryId: TEST_IDS.PANTRY,
      foodId: TEST_IDS.FOOD,
      quantity: TEST_DATA.QUANTITY,
      unit: Unit.KG,
      notes: TEST_DATA.NOTES,
      expiryDate: TEST_DATES.EXPIRY,
      ...overrides,
    };
  }

  static createUpdatePantryItemDto(
    overrides?: Partial<UpdatePantryItemDto>,
  ): UpdatePantryItemDto {
    return {
      quantity: 3,
      unit: Unit.PIECES,
      notes: 'Updated notes',
      ...overrides,
    };
  }

  static createQueryPantryItemDto(
    overrides?: Partial<QueryPantryItemDto>,
  ): QueryPantryItemDto {
    return {
      pantryId: TEST_IDS.PANTRY,
      ...overrides,
    };
  }
}

