import { Test, TestingModule } from '@nestjs/testing';
import { FoodWasteController } from './food-waste.controller';
import { FoodWasteService } from '../services/food-waste.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import {
  TEST_FOOD_WASTE,
  TEST_CREATE_FOOD_WASTE_DTO,
  TEST_UPDATE_FOOD_WASTE_DTO,
  TEST_QUERY_FOOD_WASTE_DTO,
  TEST_PAGINATED_FOOD_WASTE,
  TEST_FOOD_WASTE_STATISTICS,
  TEST_FOOD_WASTE_TRENDS,
} from '../../../test/fixtures/food-waste.fixtures';

describe('FoodWasteController', () => {
  let controller: FoodWasteController;
  let service: FoodWasteService;

  const mockFoodWasteService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getStatistics: jest.fn(),
    getTrends: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodWasteController],
      providers: [
        {
          provide: FoodWasteService,
          useValue: mockFoodWasteService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FoodWasteController>(FoodWasteController);
    service = module.get<FoodWasteService>(FoodWasteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return result', async () => {
      mockFoodWasteService.create.mockResolvedValue(TEST_FOOD_WASTE);

      const result = await controller.create(
        TEST_CREATE_FOOD_WASTE_DTO as any,
        'user-1',
      );

      expect(service.create).toHaveBeenCalledWith(
        TEST_CREATE_FOOD_WASTE_DTO,
        'user-1',
      );
      expect(result).toBe(TEST_FOOD_WASTE);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll and return paginated result', async () => {
      mockFoodWasteService.findAll.mockResolvedValue(TEST_PAGINATED_FOOD_WASTE);

      const result = await controller.findAll(
        'user-1',
        TEST_QUERY_FOOD_WASTE_DTO as any,
      );

      expect(service.findAll).toHaveBeenCalledWith(
        'user-1',
        TEST_QUERY_FOOD_WASTE_DTO,
      );
      expect(result).toBe(TEST_PAGINATED_FOOD_WASTE);
    });

    it('should call service.findAll with empty query', async () => {
      mockFoodWasteService.findAll.mockResolvedValue(TEST_PAGINATED_FOOD_WASTE);

      const result = await controller.findAll('user-1', {});

      expect(service.findAll).toHaveBeenCalledWith('user-1', {});
      expect(result).toBe(TEST_PAGINATED_FOOD_WASTE);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return result', async () => {
      mockFoodWasteService.findOne.mockResolvedValue(TEST_FOOD_WASTE);

      const result = await controller.findOne('food-waste-1', 'user-1');

      expect(service.findOne).toHaveBeenCalledWith('food-waste-1', 'user-1');
      expect(result).toBe(TEST_FOOD_WASTE);
    });
  });

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const updatedWaste = {
        ...TEST_FOOD_WASTE,
        ...TEST_UPDATE_FOOD_WASTE_DTO,
      };
      mockFoodWasteService.update.mockResolvedValue(updatedWaste);

      const result = await controller.update(
        'food-waste-1',
        TEST_UPDATE_FOOD_WASTE_DTO as any,
        'user-1',
      );

      expect(service.update).toHaveBeenCalledWith(
        'food-waste-1',
        TEST_UPDATE_FOOD_WASTE_DTO,
        'user-1',
      );
      expect(result).toBe(updatedWaste);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockFoodWasteService.remove.mockResolvedValue(undefined);

      await controller.remove('food-waste-1', 'user-1');

      expect(service.remove).toHaveBeenCalledWith('food-waste-1', 'user-1');
    });
  });

  describe('getStatistics', () => {
    it('should call service.getStatistics and return result', async () => {
      mockFoodWasteService.getStatistics.mockResolvedValue(
        TEST_FOOD_WASTE_STATISTICS,
      );

      const result = await controller.getStatistics('user-1');

      expect(service.getStatistics).toHaveBeenCalledWith(
        'user-1',
        undefined,
        undefined,
      );
      expect(result).toBe(TEST_FOOD_WASTE_STATISTICS);
    });

    it('should call service.getStatistics with date filters', async () => {
      mockFoodWasteService.getStatistics.mockResolvedValue(
        TEST_FOOD_WASTE_STATISTICS,
      );

      const result = await controller.getStatistics(
        'user-1',
        '2026-02-01',
        '2026-02-28',
      );

      expect(service.getStatistics).toHaveBeenCalledWith(
        'user-1',
        '2026-02-01',
        '2026-02-28',
      );
      expect(result).toBe(TEST_FOOD_WASTE_STATISTICS);
    });
  });

  describe('getTrends', () => {
    it('should call service.getTrends and return result', async () => {
      mockFoodWasteService.getTrends.mockResolvedValue(TEST_FOOD_WASTE_TRENDS);

      const result = await controller.getTrends(
        'user-1',
        '2026-02-13',
        '2026-02-14',
      );

      expect(service.getTrends).toHaveBeenCalledWith(
        'user-1',
        '2026-02-13',
        '2026-02-14',
        'day',
      );
      expect(result).toBe(TEST_FOOD_WASTE_TRENDS);
    });

    it('should call service.getTrends with interval parameter', async () => {
      mockFoodWasteService.getTrends.mockResolvedValue(TEST_FOOD_WASTE_TRENDS);

      const result = await controller.getTrends(
        'user-1',
        '2026-02-01',
        '2026-02-28',
        'week',
      );

      expect(service.getTrends).toHaveBeenCalledWith(
        'user-1',
        '2026-02-01',
        '2026-02-28',
        'week',
      );
      expect(result).toBe(TEST_FOOD_WASTE_TRENDS);
    });
  });
});
