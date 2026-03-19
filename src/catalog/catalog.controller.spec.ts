import { Test, TestingModule } from '@nestjs/testing';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../common/guards/database-auth.guards';

describe('CatalogController', () => {
  let controller: CatalogController;
  let service: jest.Mocked<CatalogService>;

  beforeEach(async () => {
    const mockCatalogService = {
      getMealCategories: jest.fn(),
      getMealCourses: jest.fn(),
      getDietaryLabels: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [{ provide: CatalogService, useValue: mockCatalogService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CatalogController>(CatalogController);
    service = module.get(CatalogService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return meal categories', () => {
    service.getMealCategories.mockReturnValueOnce(['MEAT', 'SEAFOOD']);

    const result = controller.getMealCategories();

    expect(result).toEqual(['MEAT', 'SEAFOOD']);
    expect(service.getMealCategories).toHaveBeenCalledTimes(1);
  });
});
