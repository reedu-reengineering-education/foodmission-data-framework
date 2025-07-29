import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health';
import { PrismaService } from '../database/prisma.service';

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

    it('should throw HealthCheckError when database is not accessible', async () => {
      const dbError = new Error('Connection failed');
      prismaService.$queryRaw.mockRejectedValue(dbError);

      await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);

      try {
        await indicator.isHealthy('database');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        expect(error.message).toBe('Database check failed');
        expect(error.causes).toEqual({
          database: {
            status: 'down',
            message: 'Database connection failed',
            error: 'Connection failed',
          },
        });
      }
    });

    it('should handle different database error types', async () => {
      const dbError = new Error('Timeout');
      prismaService.$queryRaw.mockRejectedValue(dbError);

      await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);

      try {
        await indicator.isHealthy('database');
      } catch (error) {
        expect(error.causes.database.error).toBe('Timeout');
      }
    });
  });
});