import { Test, TestingModule } from '@nestjs/testing';
import { StaticValuesController } from './static-values.controller';
import { StaticValuesService } from '../services/static-values.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

describe('StaticValuesController', () => {
  let controller: StaticValuesController;
  let service: jest.Mocked<StaticValuesService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<StaticValuesService>> = {
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
      listMealTypes: jest.fn(),
      listGroupRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaticValuesController],
      providers: [{ provide: StaticValuesService, useValue: mockService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(StaticValuesController);
    service = module.get(StaticValuesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('startup should bundle small static lists', () => {
    service.listGenders.mockReturnValue({
      data: [{ code: 'MALE', label: 'Male' }],
    } as any);
    service.listActivityLevels.mockReturnValue({ data: [] } as any);
    service.listEducationLevels.mockReturnValue({ data: [] } as any);
    service.listAnnualIncomeLevels.mockReturnValue({ data: [] } as any);
    service.listDietaryPreferencesPhase1.mockReturnValue({ data: [] } as any);
    service.listShoppingResponsibilities.mockReturnValue({ data: [] } as any);

    const res = controller.startup();
    expect(res.data.genders[0].code).toBe('MALE');
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
