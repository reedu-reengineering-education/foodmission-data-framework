import {
  UsageAnalyticsController,
  parseBoundedInt,
} from './controllers/usage-analytics.controller';
import { UsageAnalyticsService } from './services/usage-analytics.service';
import { UsageAnalyticsRepository } from './repositories/usage-analytics.repository';

describe('UsageAnalyticsService', () => {
  let repository: jest.Mocked<UsageAnalyticsRepository>;
  let service: UsageAnalyticsService;

  beforeEach(() => {
    repository = {
      getTotals: jest.fn(),
      getBreakdown: jest.fn(),
      getWeeklyTrend: jest.fn(),
    } as unknown as jest.Mocked<UsageAnalyticsRepository>;
    service = new UsageAnalyticsService(repository);
  });

  it('builds the overview with stickiness ratios and all breakdowns', async () => {
    repository.getTotals.mockResolvedValue({
      totalUsers: 100,
      active1d: 10,
      active7d: 30,
      active30d: 60,
      new7d: 5,
      new30d: 20,
      neverSeen: 8,
    });
    repository.getBreakdown.mockImplementation((dim) =>
      Promise.resolve([{ value: `${dim}-a`, totalUsers: 3, activeUsers: 1 }]),
    );

    const result = await service.getOverview(7);

    expect(repository.getBreakdown).toHaveBeenCalledTimes(4);
    expect(repository.getBreakdown).toHaveBeenCalledWith('country', 7);
    expect(result).toMatchObject({
      totalUsers: 100,
      activeUsers: { last1d: 10, last7d: 30, last30d: 60 },
      newUsers: { last7d: 5, last30d: 20 },
      neverSeenUsers: 8,
      stickiness: { dauOverMau: 0.167, wauOverMau: 0.5 },
      activeWindowDays: 7,
    });
    expect(result.breakdowns.ageGroup).toEqual([
      { value: 'ageGroup-a', totalUsers: 3, activeUsers: 1 },
    ]);
  });

  it('returns null stickiness when there are no monthly actives', async () => {
    repository.getTotals.mockResolvedValue({
      totalUsers: 2,
      active1d: 0,
      active7d: 0,
      active30d: 0,
      new7d: 0,
      new30d: 0,
      neverSeen: 2,
    });
    repository.getBreakdown.mockResolvedValue([]);

    const result = await service.getOverview(7);

    expect(result.stickiness).toEqual({ dauOverMau: null, wauOverMau: null });
  });
});

describe('UsageAnalyticsController', () => {
  it('defaults and validates numeric query params', async () => {
    const service = {
      getOverview: jest.fn(),
      getWeeklyTrend: jest.fn(),
    } as unknown as jest.Mocked<UsageAnalyticsService>;
    const controller = new UsageAnalyticsController(service);

    await controller.getOverview(undefined);
    await controller.getTrend('26');

    expect(service.getOverview).toHaveBeenCalledWith(7);
    expect(service.getWeeklyTrend).toHaveBeenCalledWith(26);
    expect(() => parseBoundedInt('0', 'weeks', 12, 104)).toThrow(
      'Invalid weeks "0"',
    );
    expect(() => parseBoundedInt('3.5', 'weeks', 12, 104)).toThrow();
    expect(() => parseBoundedInt('105', 'weeks', 12, 104)).toThrow();
  });
});
