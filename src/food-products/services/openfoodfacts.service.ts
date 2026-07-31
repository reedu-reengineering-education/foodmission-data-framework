import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosResponse } from 'axios';
import { Observable, throwError } from 'rxjs';
import { map, catchError, timeout, retry } from 'rxjs/operators';
import { OffMongoProductRepository } from '../repositories/off-mongo-product.repository';
import {
  OpenFoodFactsProduct,
  OpenFoodFactsSearchResponse,
  ProductInfo,
  NutritionalInfo,
  OpenFoodFactsSearchOptions,
  OpenFoodFactsNutriments,
} from '../interfaces/openfoodfacts.interface';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import { pickLocalizedString } from '../utils/off-locale';

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);
  private readonly baseUrl = 'https://world.openfoodfacts.org';
  private readonly apiTimeout = 10000; // 10 seconds
  private readonly maxRetries = 3;
  private readonly mongoTimeout = 5000; // 5 seconds

  constructor(
    private readonly httpService: HttpService,
    private readonly offMongoRepository: OffMongoProductRepository,
  ) {}

  /**
   * Get product information by barcode.
   * Tries the local OpenFoodFacts MongoDB clone first, falling back to the
   * live HTTP API if the clone is unconfigured, unreachable, or errors.
   */
  async getProductByBarcode(
    barcode: string,
    lang: string = DEFAULT_LOCALE,
  ): Promise<ProductInfo | null> {
    if (this.offMongoRepository.isAvailable) {
      try {
        const doc = await this.withMongoTimeout(
          this.offMongoRepository.findByBarcode(barcode),
        );
        if (doc) {
          const productInfo = this.transformProduct(
            { ...doc, _id: doc.id ?? doc._id },
            lang,
          );
          this.logger.log(
            `Found product in local OFF database: ${productInfo.name}`,
          );
          return productInfo;
        }
        this.logger.warn(
          `Product not found in local OFF database for barcode: ${barcode}`,
        );
        return null;
      } catch (error) {
        this.logger.warn(
          `Local OFF database lookup failed for barcode ${barcode}, falling back to HTTP API`,
          error as Error,
        );
      }
    }

    return this.getProductByBarcodeHttp(barcode, lang);
  }

  private async getProductByBarcodeHttp(
    barcode: string,
    lang: string = DEFAULT_LOCALE,
  ): Promise<ProductInfo | null> {
    this.logger.log(`Fetching product by barcode: ${barcode}`);

    const url = `${this.baseUrl}/api/v0/product/${barcode}.json`;
    const params = this.buildProductHttpParams(lang);

    const response = await this.httpService
      .get<OpenFoodFactsProduct>(url, { params })
      .pipe(
        timeout(this.apiTimeout),
        retry(this.maxRetries),
        map((response: AxiosResponse<OpenFoodFactsProduct>) => response.data),
        catchError((error: AxiosError) => this.handleError(error)),
      )
      .toPromise();

    if (!response || response.status !== 1 || !response.product) {
      this.logger.warn(`Product not found for barcode: ${barcode}`);
      return null;
    }

    const productInfo = this.transformProduct(response.product, lang);

    this.logger.log(`Successfully fetched product: ${productInfo.name}`);
    return productInfo;
  }

  /**
   * Search products by name or other criteria.
   * Tries the local OpenFoodFacts MongoDB clone first, falling back to the
   * live HTTP API if the clone is unconfigured, unreachable, or errors.
   */
  async searchProducts(options: OpenFoodFactsSearchOptions): Promise<{
    products: ProductInfo[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const lang = options.lang ?? DEFAULT_LOCALE;

    if (this.offMongoRepository.isAvailable) {
      try {
        const { items, totalCount, page, pageSize } =
          await this.withMongoTimeout(this.offMongoRepository.search(options));

        const products = items.map((doc) =>
          this.transformProduct({ ...doc, _id: doc.id }, lang),
        );

        this.logger.log(
          `Found ${products.length} products in local OFF database`,
        );

        return {
          products,
          totalCount,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        };
      } catch (error) {
        this.logger.warn(
          'Local OFF database search failed, falling back to HTTP API',
          error as Error,
        );
      }
    }

    return this.searchProductsHttp(options);
  }

  private async searchProductsHttp(options: OpenFoodFactsSearchOptions) {
    this.logger.log(`Searching products with options:`, options);
    const lang = options.lang ?? DEFAULT_LOCALE;

    // Build search parameters
    const params = this.buildSearchParams(options);

    const url = `${this.baseUrl}/cgi/search.pl`;

    const response = await this.httpService
      .get<OpenFoodFactsSearchResponse>(url, { params })
      .pipe(
        timeout(this.apiTimeout),
        retry(this.maxRetries),
        map(
          (response: AxiosResponse<OpenFoodFactsSearchResponse>) =>
            response.data,
        ),
        catchError((error: AxiosError) => this.handleError(error)),
      )
      .toPromise();

    if (!response) {
      throw new HttpException(
        'No response from OpenFoodFacts API',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const products = response.products
      .filter((product) => product.product_name) // Only include products with names
      .map((product) => this.transformProduct(product, lang));

    const result = {
      products,
      totalCount: response.count,
      page: response.page,
      pageSize: response.page_size,
      totalPages: response.page_count,
    };

    this.logger.log(`Found ${products.length} products`);
    return result;
  }

  private withMongoTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('OFF Mongo lookup timed out')),
        this.mongoTimeout,
      );
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  /**
   * Get nutritional information for a product
   */
  async getNutritionalInfo(barcode: string): Promise<NutritionalInfo | null> {
    const product = await this.getProductByBarcode(barcode);
    return product?.nutritionalInfo || null;
  }

  /**
   * Check if a product exists in OpenFoodFacts
   */
  async productExists(barcode: string): Promise<boolean> {
    try {
      const product = await this.getProductByBarcode(barcode);
      return product !== null;
    } catch (error) {
      // For productExists, we want to return false on any error
      // rather than throwing, as this is a boolean check method
      this.logger.error(`Error checking if product exists ${barcode}:`, error);
      return false;
    }
  }

  /**
   * Get product suggestions based on partial barcode or name
   */
  async getProductSuggestions(
    query: string,
    limit: number = 10,
  ): Promise<ProductInfo[]> {
    const searchResult = await this.searchProducts({
      query,
      pageSize: limit,
      sortBy: 'popularity',
    });

    return searchResult.products;
  }

  // Private helper methods

  private transformProduct(
    product: Record<string, unknown>,
    lang: string = DEFAULT_LOCALE,
  ): ProductInfo {
    const brands = product.brands;
    const nutriments = product.nutriments as
      OpenFoodFactsNutriments | undefined;
    const id = this.toOptionalString(product._id) ?? '';

    return {
      id,
      barcode: id,
      name: this.getProductName(product, lang),
      genericName: pickLocalizedString(product, 'generic_name', lang),
      brands:
        typeof brands === 'string'
          ? brands.split(',').map((b: string) => b.trim())
          : [],
      categories: (product.categories_tags as string[]) || [],
      labels: (product.labels_tags as string[]) || [],
      quantity: this.toOptionalString(product.quantity),
      servingSize: this.toOptionalString(product.serving_size),
      packaging: (product.packaging_tags as string[]) || [],
      origins: this.toOptionalString(product.origins),
      manufacturingPlaces: this.toOptionalString(product.manufacturing_places),
      ingredients: pickLocalizedString(product, 'ingredients_text', lang),
      allergens: (product.allergens_tags as string[]) || [],
      traces: (product.traces_tags as string[]) || [],
      nutritionGrade: this.toOptionalString(product.nutrition_grades),
      novaGroup: this.toOptionalNumber(product.nova_group),
      ecoscoreGrade: this.toOptionalString(product.ecoscore_grade),
      carbonFootprint: (nutriments as Record<string, unknown> | undefined)?.[
        'carbon-footprint-from-known-ingredients_product'
      ]
        ? Number(
            (nutriments as Record<string, unknown>)[
              'carbon-footprint-from-known-ingredients_product'
            ],
          )
        : undefined,
      nutritionDataPer: this.toOptionalString(product.nutrition_data_per),
      imageUrl: this.toOptionalString(product.image_url),
      imageFrontUrl: this.toOptionalString(product.image_front_url),
      imageNutritionUrl: this.toOptionalString(product.image_nutrition_url),
      imageIngredientsUrl: this.toOptionalString(product.image_ingredients_url),
      nutritionalInfo: this.transformNutriments(nutriments),
      countries: (product.countries_tags as string[]) || [],
      stores: (product.stores_tags as string[]) || [],
      completeness: this.toOptionalNumber(product.completeness),
      createdAt:
        typeof product.created_t === 'number'
          ? new Date(product.created_t * 1000)
          : undefined,
      lastModified:
        typeof product.last_modified_t === 'number'
          ? new Date(product.last_modified_t * 1000)
          : undefined,
    };
  }

  // OFF documents store some fields (quantity/serving_size/nova_group/...)
  // inconsistently as either a string or a bare number across the corpus.
  private toOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString();
    }
    return undefined;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) return undefined;
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  }

  private getProductName(
    product: Record<string, unknown>,
    lang: string = DEFAULT_LOCALE,
  ): string {
    return (
      pickLocalizedString(product, 'product_name', lang) ||
      pickLocalizedString(product, 'generic_name', lang) ||
      'Unknown Product'
    );
  }

  private transformNutriments(
    nutriments?: OpenFoodFactsNutriments,
  ): NutritionalInfo | undefined {
    if (!nutriments) return undefined;

    return {
      energyKcal: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'],
      energyKj: nutriments['energy-kj_100g'] || nutriments['energy-kj'],
      fat: nutriments.fat_100g || nutriments.fat,
      saturatedFat:
        nutriments['saturated-fat_100g'] || nutriments['saturated-fat'],
      transFat: nutriments['trans-fat_100g'] || nutriments['trans-fat'],
      cholesterol: nutriments.cholesterol_100g || nutriments.cholesterol,
      carbohydrates: nutriments.carbohydrates_100g || nutriments.carbohydrates,
      sugars: nutriments.sugars_100g || nutriments.sugars,
      fiber: nutriments.fiber_100g || nutriments.fiber,
      proteins: nutriments.proteins_100g || nutriments.proteins,
      salt: nutriments.salt_100g || nutriments.salt,
      sodium: nutriments.sodium_100g || nutriments.sodium,
      vitaminA: nutriments['vitamin-a_100g'] || nutriments['vitamin-a'],
      vitaminC: nutriments['vitamin-c_100g'] || nutriments['vitamin-c'],
      calcium: nutriments.calcium_100g || nutriments.calcium,
      iron: nutriments.iron_100g || nutriments.iron,
    };
  }

  private buildProductHttpParams(lang: string): Record<string, string> {
    return { lc: lang || DEFAULT_LOCALE };
  }

  private buildSearchParams(options: OpenFoodFactsSearchOptions): any {
    const lang = options.lang ?? DEFAULT_LOCALE;
    const params: any = {
      action: 'process',
      json: 1,
      page: options.page || 1,
      page_size: options.pageSize || 20,
      lc: lang,
    };

    if (options.query) {
      params.search_terms = options.query;
    }

    if (options.categories && options.categories.length > 0) {
      params.tagtype_0 = 'categories';
      params.tag_contains_0 = 'contains';
      params.tag_0 = options.categories.join(',');
    }

    if (options.brands && options.brands.length > 0) {
      params.tagtype_1 = 'brands';
      params.tag_contains_1 = 'contains';
      params.tag_1 = options.brands.join(',');
    }

    if (options.countries && options.countries.length > 0) {
      params.tagtype_2 = 'countries';
      params.tag_contains_2 = 'contains';
      params.tag_2 = options.countries.join(',');
    }

    if (options.sortBy) {
      params.sort_by = options.sortBy;
    }

    if (options.fields && options.fields.length > 0) {
      params.fields = options.fields.join(',');
    }

    return params;
  }

  private handleError(error: AxiosError): Observable<never> {
    let errorMessage = 'OpenFoodFacts API error';
    let statusCode = HttpStatus.SERVICE_UNAVAILABLE;

    if (error.response) {
      // Server responded with error status
      statusCode = error.response.status;
      errorMessage = `OpenFoodFacts API error: ${error.response.status} ${error.response.statusText}`;

      if (error.response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
        statusCode = HttpStatus.TOO_MANY_REQUESTS;
      }
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'No response from OpenFoodFacts API';
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
    } else {
      // Something else happened
      errorMessage = `Request error: ${error.message}`;
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    this.logger.error(errorMessage, error.stack);
    return throwError(() => new HttpException(errorMessage, statusCode));
  }
}
