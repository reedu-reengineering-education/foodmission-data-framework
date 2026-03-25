import { PantryResponseDto } from '../dto/response-pantry.dto';
import { TEST_IDS } from '../../common/test-utils/test-constants';

export class PantriesTestBuilder {
  static createPantryResponseDto(
    overrides?: Partial<PantryResponseDto>,
  ): PantryResponseDto {
    return {
      id: TEST_IDS.PANTRY,
      userId: TEST_IDS.USER,
      items: [],
      ...overrides,
    };
  }

  static createPantryResponseDtoArray(count: number = 2): PantryResponseDto[] {
    return Array.from({ length: count }, (_, index) =>
      this.createPantryResponseDto({
        id: `${TEST_IDS.PANTRY}-${index + 1}`,
      }),
    );
  }
}
