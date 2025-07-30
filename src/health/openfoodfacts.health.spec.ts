import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { OpenFoodFactsHealthIndicator } from './openfoodfacts.health';

describe('OpenFoodFactsHealthIndicator', () => {
  let indicator: OpenFoodFactsHealthIndicator;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'OPENFOODFACTS_API_URL') {
          return 'https://world.openfoodfacts.org';
        }
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenFoodFactsHealthIndicator,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    indicator = module.get<OpenFoodFactsHealthIndicator>(
      OpenFoodFactsHealthIndicator,
    );
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    it('should return healthy status when OpenFoodFacts API is accessible', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: { product: { product_name: 'Test Product' } },
      };

      httpService.get.mockReturnValue(of(mockResponse));

      const result = await indicator.isHealthy('openfoodfacts');

      expect(result).toEqual({
        openfoodfacts: {
          status: 'up',
          message: 'OpenFoodFacts API is accessible',
          responseTime: expect.any(Number),
        },
      });

      expect(httpService.get).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/api/v0/product/737628064502.json',
      );
    });

    it('should throw HealthCheckError when API returns non-200 status', async () => {
      const mockResponse: AxiosResponse = {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
        data: null,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      await expect(indicator.isHealthy('openfoodfacts')).rejects.toThrow(
        HealthCheckError,
      );

      try {
        await indicator.isHealthy('openfoodfacts');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        expect(error.message).toBe('OpenFoodFacts check failed');
        expect(error.causes).toEqual({
          openfoodfacts: {
            status: 'down',
            message: 'OpenFoodFacts API is not accessible',
            error: 'Invalid response from OpenFoodFacts API',
            timeout: 5000,
          },
        });
      }
    });

    it('should throw HealthCheckError when API request fails', async () => {
      const error = new Error('Network error');
      httpService.get.mockReturnValue(throwError(() => error));

      await expect(indicator.isHealthy('openfoodfacts')).rejects.toThrow(
        HealthCheckError,
      );

      try {
        await indicator.isHealthy('openfoodfacts');
      } catch (healthError) {
        expect(healthError.causes.openfoodfacts.error).toBe('Network error');
      }
    });

    it('should use custom API URL from config', async () => {
      // Create a new indicator instance with custom config
      configService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'OPENFOODFACTS_API_URL') {
          return 'https://custom.openfoodfacts.org';
        }
        return defaultValue;
      });

      // Create new instance to pick up the new config
      const customIndicator = new (OpenFoodFactsHealthIndicator as any)(httpService, configService);

      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: { product: { product_name: 'Test Product' } },
      };

      httpService.get.mockReturnValue(of(mockResponse));

      await customIndicator.isHealthy('openfoodfacts');

      expect(httpService.get).toHaveBeenCalledWith(
        'https://custom.openfoodfacts.org/api/v0/product/737628064502.json',
      );
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      httpService.get.mockReturnValue(throwError(() => timeoutError));

      await expect(indicator.isHealthy('openfoodfacts')).rejects.toThrow(
        HealthCheckError,
      );

      try {
        await indicator.isHealthy('openfoodfacts');
      } catch (error) {
        expect(error.causes.openfoodfacts.timeout).toBe(5000);
      }
    });
  });
});
