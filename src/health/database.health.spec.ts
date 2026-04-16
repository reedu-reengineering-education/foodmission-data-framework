import { Test, TestingModule } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health';
import { PrismaService } from '../database/prisma.service';

const mockCheck = (key: string) => ({
  up: (details?: object) => ({ [key]: { status: 'up', ...details } }),
  down: (details?: object) => ({ [key]: { status: 'down', ...details } }),
});

describe('DatabaseHealthIndicator', () => {
  let indicator: DatabaseHealthIndicator;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseHealthIndicator,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HealthIndicatorService,
          useValue: { check: mockCheck },
        },
      ],
    }).compile();

    indicator = module.get<DatabaseHealthIndicator>(DatabaseHealthIndicator);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    it('should return healthy status when database is accessible', async () => {
      prismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await indicator.isHealthy('database');

      expect(result).toEqual({
        database: {
          status: 'up',
          message: 'Database connection is healthy',
        },
      });
      expect(prismaService.$queryRaw).toHaveBeenCalledWith(expect.anything());
    });

    it('should return down status when database is not accessible', async () => {
      prismaService.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const result = await indicator.isHealthy('database');

      expect(result).toEqual({
        database: {
          status: 'down',
          message: 'Database connection failed',
          error: 'Connection failed',
        },
      });
    });

    it('should include the error message in the down status', async () => {
      prismaService.$queryRaw.mockRejectedValue(new Error('Timeout'));

      const result = await indicator.isHealthy('database');

      expect(result.database.error).toBe('Timeout');
    });
  });
});
