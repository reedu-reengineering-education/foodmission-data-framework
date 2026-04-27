import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FoodProductRepository } from '../repositories/food-product.repository';
import { OpenFoodFactsService } from './openfoodfacts.service';
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

    // Check if barcode already exists
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

    // Build where clause
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

    // Build order by clause
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

        // Include OpenFoodFacts data if requested
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
      throw new NotFoundException('Food not found');
    }

    const responseDto = this.transformToResponseDto(food);

    this.logger.debug(`includeOpenFoodFacts: ${includeOpenFoodFacts}`);

    // Include OpenFoodFacts data if requested
    if (includeOpenFoodFacts && food.barcode) {
      this.logger.debug(
        `Fetching OpenFoodFacts info for barcode: ${food.barcode}`,
      );
      const offInfo = await this.getOpenFoodFactsInfo(food.barcode);
      responseDto.openFoodFactsInfo = offInfo || undefined;
    }

    return responseDto;
  }

  async findByBarcode(
    barcode: string,
    includeOpenFoodFacts: boolean = false,
  ): Promise<FoodProductResponseDto> {
    this.logger.log(`Finding food by barcode: ${barcode}`);

    const food = await this.foodProductRepository.findByBarcode(barcode);
    if (!food) {
      throw new NotFoundException('Food not found');
    }

    const responseDto = this.transformToResponseDto(food);

    // Include OpenFoodFacts data if requested
    if (includeOpenFoodFacts) {
      console.log('Fetching OpenFoodFacts info for barcode:', barcode);
      const offInfo = await this.getOpenFoodFactsInfo(barcode);
      responseDto.openFoodFactsInfo = offInfo || undefined;
    }

    return responseDto;
  }

  async update(
    id: string,
    updateFoodDto: UpdateFoodProductDto,
  ): Promise<FoodProductResponseDto> {
    this.logger.log(`Updating food: ${id}`);

    // Check if food exists
    const existingFood = await this.foodProductRepository.findById(id);
    if (!existingFood) {
      throw new NotFoundException('Food not found');
    }

    // Check if barcode already exists (excluding current food)
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
      throw new NotFoundException('Food not found');
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

    // Check if food already exists
    const existingFood =
      await this.foodProductRepository.findByBarcode(barcode);
    if (existingFood) {
      throw new BadRequestException('Food with this barcode already exists');
    }

    // Get product info from OpenFoodFacts
    const productInfo =
      await this.openFoodFactsService.getProductByBarcode(barcode);
    if (!productInfo) {
      throw new NotFoundException('Product not found in OpenFoodFacts');
    }

    // Create food from OpenFoodFacts data with all enriched fields
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
    } catch (error) {
      this.logger.error(
        `Error fetching OpenFoodFacts info for ${barcode}:`,
        error,
      );
      return null;
    }
  }

  private transformToResponseDto(food: any): FoodProductResponseDto {
    return plainToClass(FoodProductResponseDto, food, {
      excludeExtraneousValues: true,
    });
  }
}
