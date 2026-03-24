import { TestingModule } from '@nestjs/testing';
import { PantriesController } from './pantries.controller';
import { PantryService } from '../services/pantries.service';
import { createControllerTestModule } from '../../common/test-utils/controller-test-helpers';
import { createMockPantryService } from '../test-utils/pantry-service.mock';
import { PantryTestBuilder } from '../test-utils/pantry-test-builders';
import { TEST_IDS } from '../../common/test-utils/test-constants';

describe('PantriesController', () => {
  let controller: PantriesController;
  let service: PantryService;
  let mockPantryService: ReturnType<typeof createMockPantryService>;

  beforeEach(async () => {
    mockPantryService = createMockPantryService();
    const module: TestingModule = await createControllerTestModule<
      PantriesController,
      PantryService
    >({
      ControllerClass: PantriesController,
      ServiceToken: PantryService,
      mockService: mockPantryService,
    });

    controller = module.get<PantriesController>(PantriesController);
    service = module.get<PantryService>(PantryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPantry', () => {
    const userId = TEST_IDS.USER;
    const mockResponse = PantryTestBuilder.createPantryResponseDto();

    it('should call service with userId and return result', async () => {
      mockPantryService.getOrCreatePantry.mockResolvedValue(mockResponse);

      const result = await controller.getPantry(userId);

      expect(result).toEqual(mockResponse);
      expect(service.getOrCreatePantry).toHaveBeenCalledWith(userId);
      expect(service.getOrCreatePantry).toHaveBeenCalledTimes(1);
    });

    it('should auto-create pantry if it does not exist', async () => {
      const newPantryResponse = PantryTestBuilder.createPantryResponseDto({
        id: TEST_IDS.PANTRY,
        userId: userId,
      });
      mockPantryService.getOrCreatePantry.mockResolvedValue(newPantryResponse);

      const result = await controller.getPantry(userId);

      expect(result).toEqual(newPantryResponse);
      expect(service.getOrCreatePantry).toHaveBeenCalledWith(userId);
    });
  });
});
