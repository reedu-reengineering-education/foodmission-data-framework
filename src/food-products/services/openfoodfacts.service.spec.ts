import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AxiosResponse, AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import { OpenFoodFactsService } from './openfoodfacts.service';
import {
  OpenFoodFactsProduct,
  OpenFoodFactsSearchResponse,
  OpenFoodFactsSearchOptions,
} from '../interfaces/openfoodfacts.interface';

describe('OpenFoodFactsService', () => {
  let service: OpenFoodFactsService;
  let httpService: jest.Mocked<HttpService>;

  const mockProduct: OpenFoodFactsProduct = {
    code: '3017620422003',
    product: {
      _id: '3017620422003',
      product_name: 'Nutella',
      product_name_en: 'Nutella',
      generic_name: 'Hazelnut spread',
      brands: 'Ferrero',
      categories: 'Sweet spreads',
      categories_tags: ['en:sweet-spreads', 'en:chocolate-spreads'],
      labels_tags: ['en:palm-oil-free'],
      quantity: '400g',
      serving_size: '15g',
      packaging_tags: ['en:jar', 'en:glass'],
      origins: 'Italy',
      manufacturing_places: 'Italy',
      ingredients_text_en: 'Sugar, palm oil, hazelnuts, cocoa, milk powder',
      allergens_tags: ['en:milk', 'en:nuts'],
      traces_tags: ['en:gluten'],
      nutrition_grades: 'e',
      nova_group: 4,
      ecoscore_grade: 'd',
      image_url: 'https://example.com/image.jpg',
      image_front_url: 'https://example.com/front.jpg',
      image_nutrition_url: 'https://example.com/nutrition.jpg',
      image_ingredients_url: 'https://example.com/ingredients.jpg',
      nutriments: {
        'energy-kcal_100g': 539,
        'energy-kj_100g': 2252,
        fat_100g: 30.9,
        'saturated-fat_100g': 10.6,
        carbohydrates_100g: 57.5,
        sugars_100g: 56.3,
        fiber_100g: 0,
        proteins_100g: 6.3,
        salt_100g: 0.107,
        sodium_100g: 0.043,
      },
      created_t: 1234567890,
      last_modified_t: 1234567891,
      completeness: 85,
      countries_tags: ['en:france', 'en:italy'],
      stores_tags: ['en:carrefour', 'en:leclerc'],
    },
    status: 1,
    status_verbose: 'product found',
  };

  const mockSearchResponse: OpenFoodFactsSearchResponse = {
    count: 100,
    page: 1,
    page_count: 5,
    page_size: 20,
    skip: 0,
    products: [
      {
        product_name: 'Nutella',
        brands: 'Ferrero',
        categories_tags: ['en:sweet-spreads'],
      },
    ],
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenFoodFactsService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<OpenFoodFactsService>(OpenFoodFactsService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductByBarcode', () => {
    it('should return product info for valid barcode', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsProduct> = {
        data: mockProduct,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getProductByBarcode('3017620422003');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Nutella');
      expect(result?.brands).toEqual(['Ferrero']);
      expect(result?.nutritionalInfo?.energyKcal).toBe(539);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/api/v0/product/3017620422003.json',
      );
    });

    it('should return null for non-existent product', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsProduct> = {
        data: {
          code: '1234567890',
          product: {},
          status: 0,
          status_verbose: 'product not found',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getProductByBarcode('1234567890');

      expect(result).toBeNull();
    });

    it('should make HTTP request for product data', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsProduct> = {
        data: mockProduct,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getProductByBarcode('3017620422003');

      expect(result).toBeDefined();
      expect(result?.barcode).toBe('3017620422003');
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('should handle HTTP errors', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Request failed',
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
      };

      httpService.get.mockReturnValueOnce(throwError(() => axiosError));

      await expect(
        service.getProductByBarcode('3017620422003'),
      ).rejects.toThrow(HttpException);
    });

    it('should handle rate limiting', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Rate limit exceeded',
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: {},
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
      };

      httpService.get.mockReturnValueOnce(throwError(() => axiosError));

      await expect(
        service.getProductByBarcode('3017620422003'),
      ).rejects.toThrow(
        new HttpException(
          'Rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });

    it('should handle network errors', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Network Error',
        request: {},
        isAxiosError: true,
        toJSON: () => ({}),
      };

      httpService.get.mockReturnValueOnce(throwError(() => axiosError));

      await expect(
        service.getProductByBarcode('3017620422003'),
      ).rejects.toThrow(
        new HttpException(
          'No response from OpenFoodFacts API',
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });
  });

  describe('searchProducts', () => {
    it('should search products with basic query', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsSearchResponse> = {
        data: mockSearchResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(mockResponse));

      const options: OpenFoodFactsSearchOptions = {
        query: 'nutella',
        pageSize: 20,
      };

      const result = await service.searchProducts(options);

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(1);
      expect(result.totalCount).toBe(100);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(5);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/cgi/search.pl',
        expect.objectContaining({
          params: expect.objectContaining({
            action: 'process',
            json: 1,
            search_terms: 'nutella',
            page_size: 20,
          }),
        }),
      );
    });

    it('should search products with categories filter', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsSearchResponse> = {
        data: mockSearchResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(mockResponse));

      const options: OpenFoodFactsSearchOptions = {
        categories: ['sweet-spreads'],
        pageSize: 10,
      };

      const result = await service.searchProducts(options);

      expect(result).toBeDefined();
      expect(httpService.get).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/cgi/search.pl',
        expect.objectContaining({
          params: expect.objectContaining({
            tagtype_0: 'categories',
            tag_contains_0: 'contains',
            tag_0: 'sweet-spreads',
          }),
        }),
      );
    });

    it('should make HTTP request for search data', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsSearchResponse> = {
        data: mockSearchResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(mockResponse));

      const options: OpenFoodFactsSearchOptions = {
        query: 'nutella',
      };

      const result = await service.searchProducts(options);

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(1);
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('should handle search errors', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Search failed',
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {},
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
      };

      httpService.get.mockReturnValueOnce(throwError(() => axiosError));

      const options: OpenFoodFactsSearchOptions = {
        query: 'invalid query',
      };

      await expect(service.searchProducts(options)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getNutritionalInfo', () => {
    it('should return nutritional info for valid barcode', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsProduct> = {
        data: mockProduct,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getNutritionalInfo('3017620422003');

      expect(result).toBeDefined();
      expect(result?.energyKcal).toBe(539);
      expect(result?.fat).toBe(30.9);
      expect(result?.carbohydrates).toBe(57.5);
      expect(result?.proteins).toBe(6.3);
    });

    it('should return null for product without nutritional info', async () => {
      const productWithoutNutrition = {
        ...mockProduct,
        product: {
          ...mockProduct.product,
          nutriments: undefined,
        },
      };

      const mockResponse: AxiosResponse<OpenFoodFactsProduct> = {
        data: productWithoutNutrition,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getNutritionalInfo('3017620422003');

      expect(result).toBeNull();
    });
  });

  describe('productExists', () => {
    it('should return true for existing product', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsProduct> = {
        data: mockProduct,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.productExists('3017620422003');

      expect(result).toBe(true);
    });

    it('should return false for non-existing product', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsProduct> = {
        data: {
          code: '1234567890',
          product: {},
          status: 0,
          status_verbose: 'product not found',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.productExists('1234567890');

      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'API Error',
        isAxiosError: true,
        toJSON: () => ({}),
      };

      httpService.get.mockReturnValueOnce(throwError(() => axiosError));

      const result = await service.productExists('3017620422003');

      expect(result).toBe(false);
    });
  });

  describe('getProductSuggestions', () => {
    it('should return product suggestions', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsSearchResponse> = {
        data: mockSearchResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getProductSuggestions('nut', 5);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/cgi/search.pl',
        expect.objectContaining({
          params: expect.objectContaining({
            search_terms: 'nut',
            page_size: 5,
            sort_by: 'popularity',
          }),
        }),
      );
    });
  });
});
