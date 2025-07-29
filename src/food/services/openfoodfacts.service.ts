import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosResponse } from 'axios';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, timeout, retry, tap } from 'rxjs/operators';
import {
    OpenFoodFactsProduct,
    OpenFoodFactsSearchResponse,
    ProductInfo,
    NutritionalInfo,
    OpenFoodFactsSearchOptions,
    OpenFoodFactsError,
    OpenFoodFactsNutriments,
} from '../interfaces/openfoodfacts.interface';

@Injectable()
export class OpenFoodFactsService {
    private readonly logger = new Logger(OpenFoodFactsService.name);
    private readonly baseUrl = 'https://world.openfoodfacts.org';
    private readonly apiTimeout = 10000; // 10 seconds
    private readonly maxRetries = 3;
    private readonly cache = new Map<string, { data: any; timestamp: number }>();
    private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

    constructor(private readonly httpService: HttpService) { }

    /**
     * Get product information by barcode
     */
    async getProductByBarcode(barcode: string): Promise<ProductInfo | null> {
        this.logger.log(`Fetching product by barcode: ${barcode}`);

        // Check cache first
        const cacheKey = `barcode:${barcode}`;
        const cachedData = this.getFromCache(cacheKey);
        if (cachedData) {
            this.logger.log(`Cache hit for barcode: ${barcode}`);
            return cachedData;
        }

        const url = `${this.baseUrl}/api/v0/product/${barcode}.json`;

        const response = await this.httpService
            .get<OpenFoodFactsProduct>(url)
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

        const productInfo = this.transformProduct(barcode, response.product);

        // Cache the result
        this.setCache(cacheKey, productInfo);

        this.logger.log(`Successfully fetched product: ${productInfo.name}`);
        return productInfo;
    }

    /**
     * Search products by name or other criteria
     */
    async searchProducts(options: OpenFoodFactsSearchOptions): Promise<{
        products: ProductInfo[];
        totalCount: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }> {
        this.logger.log(`Searching products with options:`, options);

        // Build search parameters
        const params = this.buildSearchParams(options);
        const cacheKey = `search:${JSON.stringify(params)}`;

        // Check cache first
        const cachedData = this.getFromCache(cacheKey);
        if (cachedData) {
            this.logger.log(`Cache hit for search`);
            return cachedData;
        }

        const url = `${this.baseUrl}/cgi/search.pl`;

        const response = await this.httpService
            .get<OpenFoodFactsSearchResponse>(url, { params })
            .pipe(
                timeout(this.apiTimeout),
                retry(this.maxRetries),
                map((response: AxiosResponse<OpenFoodFactsSearchResponse>) => response.data),
                catchError((error: AxiosError) => this.handleError(error)),
            )
            .toPromise();

        if (!response) {
            throw new HttpException('No response from OpenFoodFacts API', HttpStatus.SERVICE_UNAVAILABLE);
        }

        const products = response.products
            .filter(product => product.product_name) // Only include products with names
            .map((product, index) => this.transformProduct(`search-${index}`, product));

        const result = {
            products,
            totalCount: response.count,
            page: response.page,
            pageSize: response.page_size,
            totalPages: response.page_count,
        };

        // Cache the result
        this.setCache(cacheKey, result);

        this.logger.log(`Found ${products.length} products`);
        return result;
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
    async getProductSuggestions(query: string, limit: number = 10): Promise<ProductInfo[]> {
        const searchResult = await this.searchProducts({
            query,
            pageSize: limit,
            sortBy: 'popularity',
        });

        return searchResult.products;
    }

    /**
     * Clear cache (useful for testing or manual cache invalidation)
     */
    clearCache(): void {
        this.cache.clear();
        this.logger.log('Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }

    // Private helper methods

    private transformProduct(barcode: string, product: any): ProductInfo {
        return {
            barcode,
            name: this.getProductName(product),
            genericName: product.generic_name,
            brands: product.brands ? product.brands.split(',').map((b: string) => b.trim()) : [],
            categories: product.categories_tags || [],
            labels: product.labels_tags || [],
            quantity: product.quantity,
            servingSize: product.serving_size,
            packaging: product.packaging_tags || [],
            origins: product.origins,
            manufacturingPlaces: product.manufacturing_places,
            ingredients: product.ingredients_text_en || product.ingredients_text,
            allergens: product.allergens_tags || [],
            traces: product.traces_tags || [],
            nutritionGrade: product.nutrition_grades,
            novaGroup: product.nova_group,
            ecoscoreGrade: product.ecoscore_grade,
            imageUrl: product.image_url,
            imageFrontUrl: product.image_front_url,
            imageNutritionUrl: product.image_nutrition_url,
            imageIngredientsUrl: product.image_ingredients_url,
            nutritionalInfo: this.transformNutriments(product.nutriments),
            countries: product.countries_tags || [],
            stores: product.stores_tags || [],
            completeness: product.completeness,
            createdAt: product.created_t ? new Date(product.created_t * 1000) : undefined,
            lastModified: product.last_modified_t ? new Date(product.last_modified_t * 1000) : undefined,
        };
    }

    private getProductName(product: any): string {
        return product.product_name_en || product.product_name || product.generic_name || 'Unknown Product';
    }

    private transformNutriments(nutriments?: OpenFoodFactsNutriments): NutritionalInfo | undefined {
        if (!nutriments) return undefined;

        return {
            energyKcal: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'],
            energyKj: nutriments['energy-kj_100g'] || nutriments['energy-kj'],
            fat: nutriments.fat_100g || nutriments.fat,
            saturatedFat: nutriments['saturated-fat_100g'] || nutriments['saturated-fat'],
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

    private buildSearchParams(options: OpenFoodFactsSearchOptions): any {
        const params: any = {
            action: 'process',
            json: 1,
            page: options.page || 1,
            page_size: options.pageSize || 20,
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

    private getFromCache(key: string): any {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        if (cached) {
            this.cache.delete(key); // Remove expired cache
        }

        return null;
    }

    private setCache(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }
}