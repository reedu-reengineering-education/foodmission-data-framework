import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AxiosResponse, AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import { OpenFoodFactsService } from './openfoodfacts.service';
import { OffMongoProductRepository } from '../repositories/off-mongo-product.repository';
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
      ingredients_analysis_tags: [
        'en:palm-oil',
        'en:non-vegan',
        'en:vegetarian',
      ],
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

  const mockOffMongoRepository = {
    isAvailable: false,
    findByBarcode: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(async () => {
    mockOffMongoRepository.isAvailable = false;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenFoodFactsService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: OffMongoProductRepository,
          useValue: mockOffMongoRepository,
        },
      ],
    }).compile();

    service = module.get<OpenFoodFactsService>(OpenFoodFactsService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // The live-API methods are kept but not wired; test them directly.
  describe('getProductByBarcodeHttp (not wired)', () => {
    it('should return product info for valid barcode', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsProduct> = {
        data: mockProduct,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service['getProductByBarcodeHttp']('3017620422003');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Nutella');
      expect(result?.brands).toEqual(['Ferrero']);
      expect(result?.nutritionalInfo?.energyKcal).toBe(539);
      expect(result?.isVegan).toBe(false);
      expect(result?.isVegetarian).toBe(true);
      expect(result?.isPalmOilFree).toBe(false);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/api/v0/product/3017620422003.json',
        { params: { lc: 'en' } },
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

      const result = await service['getProductByBarcodeHttp']('1234567890');

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

      const result = await service['getProductByBarcodeHttp']('3017620422003');

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
        service['getProductByBarcodeHttp']('3017620422003'),
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
        service['getProductByBarcodeHttp']('3017620422003'),
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
        service['getProductByBarcodeHttp']('3017620422003'),
      ).rejects.toThrow(
        new HttpException(
          'No response from OpenFoodFacts API',
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });
  });

  describe('searchProductsHttp (not wired)', () => {
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

      const result = await service['searchProductsHttp'](options);

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(1);
      expect(result.totalCount).toBe(100);
      expect(result.totalCountCapped).toBe(false);
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
            lc: 'en',
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

      const result = await service['searchProductsHttp'](options);

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

      const result = await service['searchProductsHttp'](options);

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

      await expect(service['searchProductsHttp'](options)).rejects.toThrow(
        HttpException,
      );
    });
  });

  const localDoc = (product: object = mockProduct.product) => ({
    ...product,
    id: '3017620422003',
    _id: '3017620422003',
  });

  describe('getNutritionalInfo', () => {
    beforeEach(() => {
      mockOffMongoRepository.isAvailable = true;
    });

    it('should return nutritional info for valid barcode', async () => {
      mockOffMongoRepository.findByBarcode.mockResolvedValueOnce(localDoc());

      const result = await service.getNutritionalInfo('3017620422003');

      expect(result).toBeDefined();
      expect(result?.energyKcal).toBe(539);
      expect(result?.fat).toBe(30.9);
      expect(result?.carbohydrates).toBe(57.5);
      expect(result?.proteins).toBe(6.3);
    });

    it('should return null for product without nutritional info', async () => {
      mockOffMongoRepository.findByBarcode.mockResolvedValueOnce(
        localDoc({ ...mockProduct.product, nutriments: undefined }),
      );

      const result = await service.getNutritionalInfo('3017620422003');

      expect(result).toBeNull();
    });
  });

  describe('productExists', () => {
    beforeEach(() => {
      mockOffMongoRepository.isAvailable = true;
    });

    it('should return true for existing product', async () => {
      mockOffMongoRepository.findByBarcode.mockResolvedValueOnce(localDoc());

      await expect(service.productExists('3017620422003')).resolves.toBe(true);
    });

    it('should return false for non-existing product', async () => {
      mockOffMongoRepository.findByBarcode.mockResolvedValueOnce(null);

      await expect(service.productExists('1234567890')).resolves.toBe(false);
    });

    it('should return false when the local database fails', async () => {
      mockOffMongoRepository.findByBarcode.mockRejectedValueOnce(
        new Error('connection refused'),
      );

      await expect(service.productExists('3017620422003')).resolves.toBe(false);
      expect(httpService.get).not.toHaveBeenCalled();
    });
  });

  describe('getProductSuggestions', () => {
    it('should return product suggestions from the local database', async () => {
      mockOffMongoRepository.isAvailable = true;
      mockOffMongoRepository.search.mockResolvedValueOnce({
        items: [localDoc()],
        totalCount: 1,
        totalCountCapped: false,
        page: 1,
        pageSize: 5,
      });

      const result = await service.getProductSuggestions('nut', 5);

      expect(result).toHaveLength(1);
      expect(mockOffMongoRepository.search).toHaveBeenCalledWith({
        query: 'nut',
        pageSize: 5,
        sortBy: 'popularity',
      });
      expect(httpService.get).not.toHaveBeenCalled();
    });
  });

  describe('locale-aware transform', () => {
    it('prefers product_name_de when lang=de', async () => {
      const localizedProduct: OpenFoodFactsProduct = {
        ...mockProduct,
        product: {
          ...mockProduct.product,
          product_name: 'Nutella',
          product_name_en: 'Nutella EN',
          product_name_de: 'Nougatcreme',
          ingredients_text: 'Sugar',
          ingredients_text_en: 'Sugar, palm oil',
          ingredients_text_de: 'Zucker, Palmöl',
          generic_name: 'Hazelnut spread',
          generic_name_de: 'Haselnusscreme',
        } as any,
      };

      const mockResponse: AxiosResponse<OpenFoodFactsProduct> = {
        data: localizedProduct,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service['getProductByBarcodeHttp'](
        '3017620422003',
        'de',
      );

      expect(result?.name).toBe('Nougatcreme');
      expect(result?.genericName).toBe('Haselnusscreme');
      expect(result?.ingredients).toBe('Zucker, Palmöl');
      expect(httpService.get).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/api/v0/product/3017620422003.json',
        { params: { lc: 'de' } },
      );
    });

    it('falls back to English name when requested locale is missing', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsProduct> = {
        data: mockProduct,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service['getProductByBarcodeHttp'](
        '3017620422003',
        'de',
      );

      expect(result?.name).toBe('Nutella');
      expect(result?.ingredients).toBe(
        'Sugar, palm oil, hazelnuts, cocoa, milk powder',
      );
    });

    it('passes lc on search and localizes product names', async () => {
      const mockResponse: AxiosResponse<OpenFoodFactsSearchResponse> = {
        data: {
          ...mockSearchResponse,
          products: [
            {
              product_name: 'Nutella',
              product_name_en: 'Nutella EN',
              product_name_de: 'Nougatcreme',
              brands: 'Ferrero',
              categories_tags: ['en:sweet-spreads'],
            } as any,
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service['searchProductsHttp']({
        query: 'nutella',
        lang: 'de',
      });

      expect(result.products[0].name).toBe('Nougatcreme');
      expect(httpService.get).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/cgi/search.pl',
        expect.objectContaining({
          params: expect.objectContaining({
            lc: 'de',
            search_terms: 'nutella',
          }),
        }),
      );
    });

    it('localizes from Mongo documents with language-suffixed fields', async () => {
      mockOffMongoRepository.isAvailable = true;
      mockOffMongoRepository.findByBarcode.mockResolvedValueOnce({
        id: '3017620422003',
        _id: '3017620422003',
        product_name: 'Nutella',
        product_name_en: 'Nutella EN',
        product_name_de: 'Nougatcreme',
        brands: 'Ferrero',
      });

      const result = await service.getProductByBarcode('3017620422003', 'de');

      expect(result?.name).toBe('Nougatcreme');
      expect(httpService.get).not.toHaveBeenCalled();
    });
  });

  describe('local OFF database only (no live-API fallback)', () => {
    it('returns a product from the local database without calling the HTTP API', async () => {
      mockOffMongoRepository.isAvailable = true;
      mockOffMongoRepository.findByBarcode.mockResolvedValueOnce({
        id: '3017620422003',
        product_name: 'Nutella',
        product_name_en: 'Nutella',
        brands: 'Ferrero',
      });

      const result = await service.getProductByBarcode('3017620422003');

      expect(result?.name).toBe('Nutella');
      expect(mockOffMongoRepository.findByBarcode).toHaveBeenCalledWith(
        '3017620422003',
      );
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('returns 503, without calling the HTTP API, when the local lookup errors', async () => {
      mockOffMongoRepository.isAvailable = true;
      mockOffMongoRepository.findByBarcode.mockRejectedValueOnce(
        new Error('connection refused'),
      );

      await expect(
        service.getProductByBarcode('3017620422003'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('returns search results from the local database without calling the HTTP API', async () => {
      mockOffMongoRepository.isAvailable = true;
      mockOffMongoRepository.search.mockResolvedValueOnce({
        items: [
          {
            id: '3017620422003',
            product_name: 'Nutella',
            brands: 'Ferrero',
          },
        ],
        totalCount: 1,
        totalCountCapped: false,
        page: 1,
        pageSize: 20,
      });

      const result = await service.searchProducts({ query: 'nutella' });

      expect(result.products).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.totalCountCapped).toBe(false);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('passes a capped local count through', async () => {
      mockOffMongoRepository.isAvailable = true;
      mockOffMongoRepository.search.mockResolvedValueOnce({
        items: [{ id: '1', product_name: 'Milk' }],
        totalCount: 100,
        totalCountCapped: true,
        page: 1,
        pageSize: 20,
      });

      const result = await service.searchProducts({ query: 'milk' });

      expect(result.totalCount).toBe(100);
      expect(result.totalCountCapped).toBe(true);
      expect(result.totalPages).toBe(5);
    });

    it('returns 503, without calling the HTTP API, when the local search errors', async () => {
      mockOffMongoRepository.isAvailable = true;
      mockOffMongoRepository.search.mockRejectedValueOnce(
        new Error('connection refused'),
      );

      await expect(
        service.searchProducts({ query: 'nutella' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('returns 503 when the local database is not configured', async () => {
      mockOffMongoRepository.isAvailable = false;

      await expect(
        service.searchProducts({ query: 'nutella' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(
        service.getProductByBarcode('3017620422003'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(mockOffMongoRepository.search).not.toHaveBeenCalled();
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('does not fall back to HTTP when the local database genuinely has no match', async () => {
      mockOffMongoRepository.isAvailable = true;
      mockOffMongoRepository.findByBarcode.mockResolvedValueOnce(null);

      const result = await service.getProductByBarcode('0000000000000');

      expect(result).toBeNull();
      expect(httpService.get).not.toHaveBeenCalled();
    });
  });
});
