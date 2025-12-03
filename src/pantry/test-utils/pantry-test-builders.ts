import { PantryResponseDto } from '../dto/response-pantry.dto';
import { CreatePantryDto } from '../dto/create-pantry.dto';
import { UpdatePantryDto } from '../dto/update-pantry.dto';
import { TEST_IDS, TEST_DATA, TEST_DATES } from '../../common/test-utils/test-constants';

export class PantryTestBuilder {
  static createPantryResponseDto(
    overrides?: Partial<PantryResponseDto>,
  ): PantryResponseDto {
    return {
      id: TEST_IDS.PANTRY,
      userId: TEST_IDS.USER,
      title: TEST_DATA.PANTRY_TITLE,
      items: [],
      ...overrides,
    };
  }

  static createPantryResponseDtoArray(
    count: number = 2,
  ): PantryResponseDto[] {
    return Array.from({ length: count }, (_, index) =>
      this.createPantryResponseDto({
        id: `${TEST_IDS.PANTRY}-${index + 1}`,
        title: index === 0 ? TEST_DATA.PANTRY_TITLE : TEST_DATA.PANTRY_TITLE_2,
      }),
    );
  }

  static createCreatePantryDto(
    overrides?: Partial<CreatePantryDto>,
  ): CreatePantryDto {
    return {
      title: TEST_DATA.PANTRY_TITLE,
      ...overrides,
    };
  }

  static createUpdatePantryDto(
    overrides?: Partial<UpdatePantryDto>,
  ): UpdatePantryDto {
    return {
      title: 'Updated Pantry Name',
      ...overrides,
    };
  }
}

