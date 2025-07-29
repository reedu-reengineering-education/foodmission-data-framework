import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { FoodRepository } from '../repositories/food.repository';
import { FoodCategoryRepository } from '../repositories/food-category.repository';
import { OpenFoodFactsService } from './openfoodfacts.service';
import { CreateFoodDto } from '../dto/create-food.dto';
import { UpdateFoodDto } from '../dto/update-food.dto';
import { FoodQueryDto, FoodSearchDto } from '../dto/food-query.dto';
import { FoodResponseDto, PaginatedFoodResponseDto, OpenFoodFactsInfoDto } from '../dto/food-response.dto';
import { plainToClass } from 'class-transformer';
import { Food } from '@prisma/client';

@Injectable()
export class FoodService {
  private readonly logger = new Logger(FoodService.name);

  constructor(
    private readonly foodRepository: FoodRepository,
    private readonly categoryRepository: FoodCategoryRepository,
    private readonly openFoodFactsService: OpenFoodFactsService,
  ) {}

  async create(createFoodDto: CreateFoodDto): Promise<FoodResponseDto> {
    this.logger.log(`Creating food: ${createFoodDto.name}`);

    // Validate category exists
    const category = await this.categoryRepository.findById(createFoodDto.categoryId);
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    // Check if barcode already exists
    if (createFoodDto.barcode) {
      const existingFood = await this.foodRepository.findByBarcode(createFoodDto.barcode);
      if (existingFood) {
        throw new BadRequestException('Food with this barcode already exists');
      }
    }

    // Check if OpenFoodFacts ID already exists
    if (createFoodDto.openFoodFactsId) {
      const existingFood = await this.foodRepository.findByOpenFoodFactsId(createFoodDto.openFoodFactsId);
      if (existingFood) {
        throw new BadRequestException('Food with this OpenFoodFacts ID already exists');
      }
    }

    const food = await this.foodRepository.create(createFoodDto);
    return this.transformToResponseDto(food);
  }

  async findAll(query: FoodQueryDto): Promise<PaginatedFoodResponseDto> {
    this.logger.log(`Finding foods with query:`, query);

    const { page = 1, limit = 10, search, categoryId, barcode, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (barcode) {
      where.barcode = barcode;
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const result = await this.foodRepository.findWithPagination({
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
      })
    );

    return plainToClass(PaginatedFoodResponseDto, {
      data: transformedData,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  }

  async findOne(id: string, includeOpenFoodFacts: boolean = false): Promise<FoodResponseDto> {
    this.logger.log(`Finding food by id: ${id}`);

    const food = await this.foodRepository.findById(id);
    if (!food) {
      throw new NotFoundException('Food not found');
    }

    const responseDto = this.transformToResponseDto(food);

    // Include OpenFoodFacts data if requested
    if (includeOpenFoodFacts && food.barcode) {
      const offInfo = await this.getOpenFoodFactsInfo(food.barcode);
      responseDto.openFoodFactsInfo = offInfo || undefined;
    }

    return responseDto;
  }

  async findByBarcode(barcode: string, includeOpenFoodFacts: boolean = false): Promise<FoodResponseDto> {
    this.logger.log(`Finding food by barcode: ${barcode}`);

    const food = await this.foodRepository.findByBarcode(barcode);
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

  async update(id: string, updateFoodDto: UpdateFoodDto): Promise<FoodResponseDto> {
    this.logger.log(`Updating food: ${id}`);

    // Check if food exists
    const existingFood = await this.foodRepository.findById(id);
    if (!existingFood) {
      throw new NotFoundException('Food not found');
    }

    // Validate category if provided
    if (updateFoodDto.categoryId) {
      const category = await this.categoryRepository.findById(updateFoodDto.categoryId);
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    // Check if barcode already exists (excluding current food)
    if (updateFoodDto.barcode && updateFoodDto.barcode !== existingFood.barcode) {
      const existingFoodWithBarcode = await this.foodRepository.findByBarcode(updateFoodDto.barcode);
      if (existingFoodWithBarcode && existingFoodWithBarcode.id !== id) {
        throw new BadRequestException('Food with this barcode already exists');
      }
    }

    // Check if OpenFoodFacts ID already exists (excluding current food)
    if (updateFoodDto.openFoodFactsId && updateFoodDto.openFoodFactsId !== existingFood.openFoodFactsId) {
      const existingFoodWithOffId = await this.foodRepository.findByOpenFoodFactsId(updateFoodDto.openFoodFactsId);
      if (existingFoodWithOffId && existingFoodWithOffId.id !== id) {
        throw new BadRequestException('Food with this OpenFoodFacts ID already exists');
      }
    }

    const updatedFood = await this.foodRepository.update(id, updateFoodDto);
    return this.transformToResponseDto(updatedFood);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing food: ${id}`);

    const food = await this.foodRepository.findById(id);
    if (!food) {
      throw new NotFoundException('Food not found');
    }

    await this.foodRepository.delete(id);
  }

  async searchOpenFoodFacts(searchDto: FoodSearchDto): Promise<any> {
    this.logger.log(`Searching OpenFoodFacts with:`, searchDto);

    const searchOptions = {
      query: searchDto.query,
      categories: searchDto.category ? [searchDto.category] : undefined,
      brands: searchDto.brand ? [searchDto.brand] : undefined,
      pageSize: searchDto.limit || 10,
    };

    return await this.openFoodFactsService.searchProducts(searchOptions);
  }

  async importFromOpenFoodFacts(barcode: string, categoryId: string, createdBy: string): Promise<FoodResponseDto> {
    this.logger.log(`Importing food from OpenFoodFacts: ${barcode}`);

    // Check if food already exists
    const existingFood = await this.foodRepository.findByBarcode(barcode);
    if (existingFood) {
      throw new BadRequestException('Food with this barcode already exists');
    }

    // Get product info from OpenFoodFacts
    const productInfo = await this.openFoodFactsService.getProductByBarcode(barcode);
    if (!productInfo) {
      throw new NotFoundException('Product not found in OpenFoodFacts');
    }

    // Validate category exists
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    // Create food from OpenFoodFacts data
    const createFoodDto: CreateFoodDto = {
      name: productInfo.name,
      description: productInfo.genericName,
      barcode: productInfo.barcode,
      openFoodFactsId: productInfo.barcode, // Use barcode as OpenFoodFacts ID
      categoryId,
      createdBy,
    };

    const food = await this.foodRepository.create(createFoodDto);
    const responseDto = this.transformToResponseDto(food);
    
    // Include OpenFoodFacts data in response
    const offInfo = await this.getOpenFoodFactsInfo(barcode);
    responseDto.openFoodFactsInfo = offInfo || undefined;
    
    return responseDto;
  }

  async getOpenFoodFactsInfo(barcode: string): Promise<OpenFoodFactsInfoDto | null> {
    try {
      const productInfo = await this.openFoodFactsService.getProductByBarcode(barcode);
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
      this.logger.error(`Error fetching OpenFoodFacts info for ${barcode}:`, error);
      return null;
    }
  }

  private transformToResponseDto(food: any): FoodResponseDto {
    return plainToClass(FoodResponseDto, {
      id: food.id,
      name: food.name,
      description: food.description,
      barcode: food.barcode,
      openFoodFactsId: food.openFoodFactsId,
      category: food.category,
      createdAt: food.createdAt,
      updatedAt: food.updatedAt,
      createdBy: food.createdBy,
    });
  }
}