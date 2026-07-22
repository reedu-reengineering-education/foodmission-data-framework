import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FoodProductRepository } from '../repositories/food-product.repository';
import { OpenFoodFactsService } from './openfoodfacts.service';
import { ProductInfo } from '../interfaces/openfoodfacts.interface';
import { CreateFoodProductDto } from '../dto/create-food-product.dto';
import { UpdateFoodProductDto } from '../dto/update-food-product.dto';
import {
  FoodProductQueryDto,
  FoodProductSearchDto,
} from '../dto/food-product-query.dto';
import {
  FoodProductResponseDto,
  OpenFoodFactsInfoDto,
  PaginatedFoodProductResponseDto,
} from '../dto/food-product-response.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class FoodProductService {
  private readonly logger = new Logger(FoodProductService.name);

  constructor(
    private readonly foodProductRepository: FoodProductRepository,
    private readonly openFoodFactsService: OpenFoodFactsService,
  ) {}

  async create(
    createFoodDto: CreateFoodProductDto,
    userId: string,
  ): Promise<FoodProductResponseDto> {
    this.logger.log(`Creating food: ${createFoodDto.name}`);

    if (createFoodDto.barcode) {
      const existingFood = await this.foodProductRepository.findByBarcode(
        createFoodDto.barcode,
      );
      if (existingFood) {
        throw new BadRequestException('Food with this barcode already exists');
      }
    }

    const food = await this.foodProductRepository.create({
      ...createFoodDto,
      createdBy: userId,
    });
    return this.transformToResponseDto(food);
  }

  async findAll(
    query: FoodProductQueryDto,
  ): Promise<PaginatedFoodProductResponseDto> {
    this.logger.log(`Finding foods with query:`, query);

    const {
      page = 1,
      limit = 10,
      search,
      barcode,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (barcode) {
      where.barcode = barcode;
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const result = await this.foodProductRepository.findWithPagination({
      skip,
      take: limit,
      where,
      orderBy,
    });

    const transformedData = await Promise.all(
      result.data.map(async (food) => {
        const responseDto = this.transformToResponseDto(food);

        if (query.includeOpenFoodFacts && food.barcode) {
          const offInfo = await this.getOpenFoodFactsInfo(food.barcode);
          responseDto.openFoodFactsInfo = offInfo || undefined;
        }

        return responseDto;
      }),
    );

    return plainToClass(PaginatedFoodProductResponseDto, {
      data: transformedData,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  }

  async findOne(
    id: string,
    includeOpenFoodFacts: boolean = false,
  ): Promise<FoodProductResponseDto> {
    this.logger.log(`Finding food by id: ${id}`);

    const food = await this.foodProductRepository.findById(id);
    if (!food) {
      throw new NotFoundException('Food product not found');
    }

    const responseDto = this.transformToResponseDto(food);

    this.logger.debug(`includeOpenFoodFacts: ${includeOpenFoodFacts}`);

    if (includeOpenFoodFacts && food.barcode) {
      this.logger.debug(
        `Fetching OpenFoodFacts info for barcode: ${food.barcode}`,
      );
      const offInfo = await this.getOpenFoodFactsInfo(food.barcode);
      responseDto.openFoodFactsInfo = offInfo || undefined;
    }

    return responseDto;
  }

  async findByBarcode(barcode: string): Promise<FoodProductResponseDto> {
    this.logger.log(`Finding food by barcode: ${barcode}`);

    const offProduct =
      await this.openFoodFactsService.getProductByBarcode(barcode);
    if (!offProduct) {
      throw new NotFoundException('Food product not found');
    }

    return this.buildResponseFromOpenFoodFacts(offProduct);
  }

  async update(
    id: string,
    updateFoodDto: UpdateFoodProductDto,
  ): Promise<FoodProductResponseDto> {
    this.logger.log(`Updating food: ${id}`);

    const existingFood = await this.foodProductRepository.findById(id);
    if (!existingFood) {
      throw new NotFoundException('Food product not found');
    }

    if (
      updateFoodDto.barcode &&
      updateFoodDto.barcode !== existingFood.barcode
    ) {
      const existingFoodWithBarcode =
        await this.foodProductRepository.findByBarcode(updateFoodDto.barcode);
      if (existingFoodWithBarcode && existingFoodWithBarcode.id !== id) {
        throw new BadRequestException('Food with this barcode already exists');
      }
    }

    const updatedFood = await this.foodProductRepository.update(
      id,
      updateFoodDto,
    );
    return this.transformToResponseDto(updatedFood);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing food: ${id}`);

    const food = await this.foodProductRepository.findById(id);
    if (!food) {
      throw new NotFoundException('Food product not found');
    }

    await this.foodProductRepository.delete(id);
  }

  async searchOpenFoodFacts(searchDto: FoodProductSearchDto): Promise<any> {
    this.logger.log(`Searching OpenFoodFacts with:`, searchDto);

    const searchOptions = {
      query: searchDto.query,
      categories: searchDto.category ? [searchDto.category] : undefined,
      brands: searchDto.brand ? [searchDto.brand] : undefined,
      page: searchDto.page || 1,
      pageSize: searchDto.pageSize || searchDto.limit || 10,
    };

    return await this.openFoodFactsService.searchProducts(searchOptions);
  }

  async importFromOpenFoodFacts(
    barcode: string,
    createdBy: string,
  ): Promise<FoodProductResponseDto> {
    this.logger.log(`Importing food from OpenFoodFacts: ${barcode}`);

    const existingFood =
      await this.foodProductRepository.findByBarcode(barcode);
    if (existingFood) {
      throw new BadRequestException('Food with this barcode already exists');
    }

    const productInfo =
      await this.openFoodFactsService.getProductByBarcode(barcode);
    if (!productInfo) {
      throw new NotFoundException('Product not found in OpenFoodFacts');
    }

    const food = await this.foodProductRepository.create({
      name: productInfo.name,
      description: productInfo.genericName,
      barcode: productInfo.barcode,
      createdBy,
    });

    return this.transformToResponseDto(food);
  }

  async getOpenFoodFactsInfo(
    barcode: string,
  ): Promise<OpenFoodFactsInfoDto | null> {
    try {
      const productInfo =
        await this.openFoodFactsService.getProductByBarcode(barcode);
      if (!productInfo) {
        return null;
      }

      return this.mapToOpenFoodFactsInfoDto(productInfo);
    } catch (error) {
      this.logger.error(
        `Error fetching OpenFoodFacts info for ${barcode}:`,
        error,
      );
      return null;
    }
  }

  private mapToOpenFoodFactsInfoDto(
    productInfo: ProductInfo,
  ): OpenFoodFactsInfoDto {
    return plainToClass(OpenFoodFactsInfoDto, {
      barcode: productInfo.barcode,
      name: productInfo.name,
      brands: productInfo.brands,
      categories: productInfo.categories,
      ingredients: productInfo.ingredients,
      allergens: productInfo.allergens,
      nutritionGrade: productInfo.nutritionGrade,
      novaGroup: productInfo.novaGroup,
      nutritionalInfo: productInfo.nutritionalInfo,
      imageUrl: productInfo.imageUrl,
      completeness: productInfo.completeness,
    });
  }

  // Barcode found only in OpenFoodFacts (Mongo dump or live API), not in our
  // local catalog. Read-only passthrough: no FoodProduct row is created, so
  // `id` is not a real local id and this product can't be PATCHed/DELETEd.
  private buildResponseFromOpenFoodFacts(
    productInfo: ProductInfo,
  ): FoodProductResponseDto {
    return plainToClass(
      FoodProductResponseDto,
      {
        id: productInfo.barcode,
        name: productInfo.name,
        description: productInfo.genericName,
        barcode: productInfo.barcode,
        brands: productInfo.brands?.join(', '),
        categories: productInfo.categories,
        labels: productInfo.labels,
        quantity: productInfo.quantity,
        servingSize: productInfo.servingSize,
        ingredientsText: productInfo.ingredients,
        allergens: productInfo.allergens,
        traces: productInfo.traces,
        countries: productInfo.countries,
        origins: productInfo.origins,
        manufacturingPlaces: productInfo.manufacturingPlaces,
        imageUrl: productInfo.imageUrl,
        imageFrontUrl: productInfo.imageFrontUrl,
        openFoodFactsInfo: this.mapToOpenFoodFactsInfoDto(productInfo),
      },
      { excludeExtraneousValues: true },
    );
  }

  private transformToResponseDto(food: any): FoodProductResponseDto {
    return plainToClass(FoodProductResponseDto, food, {
      excludeExtraneousValues: true,
    });
  }
}
