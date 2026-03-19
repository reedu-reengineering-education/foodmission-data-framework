import { Test, TestingModule } from '@nestjs/testing';
import { CatalogController } from './catalog.controller';
import { CatalogService } from '../services/catalog.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

describe('CatalogController', () => {
  let controller: CatalogController;
  let service: jest.Mocked<CatalogService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<CatalogService>> = {
      startup: jest.fn(),
      listGenders: jest.fn(),
      listActivityLevels: jest.fn(),
      listEducationLevels: jest.fn(),
      listAnnualIncomeLevels: jest.fn(),
      listDietaryPreferencesPhase1: jest.fn(),
      listShoppingResponsibilities: jest.fn(),
      listLanguages: jest.fn(),
      listCountries: jest.fn(),
      listRegions: jest.fn(),
      listUnits: jest.fn(),
      listTypeOfMeals: jest.fn(),
      listGroupRoles: jest.fn(),
    };

    mockService.startup?.mockReturnValue({
      data: {
        genders: [],
        activityLevels: [],
        educationLevels: [],
        annualIncomeLevels: [],
        dietaryPreferences: [],
        shoppingResponsibilities: [],
      },
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [{ provide: CatalogService, useValue: mockService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CatalogController);
    service = module.get(CatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('startup should delegate to service', () => {
    controller.startup();
    expect(service.startup).toHaveBeenCalled();
  });

  it('countries should delegate to service with query', () => {
    service.listCountries.mockReturnValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    } as any);

    controller.countries({ page: 1, limit: 10, search: 'nl' } as any);
    expect(service.listCountries).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: 'nl',
    });
  });
});
