import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FoodRepository } from '../repositories/food.repository';
import { OpenFoodFactsService } from './openfoodfacts.service';
import { CreateFoodDto } from '../dto/create-food.dto';
import { UpdateFoodDto } from '../dto/update-food.dto';
import { FoodQueryDto, FoodSearchDto } from '../dto/food-query.dto';
import {
  FoodResponseDto,
  PaginatedFoodResponseDto,
  OpenFoodFactsInfoDto,
} from '../dto/food-response.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class FoodService {
  private readonly logger = new Logger(FoodService.name);

  constructor(
    private readonly foodRepository: FoodRepository,
    private readonly openFoodFactsService: OpenFoodFactsService,
  ) {}

  async create(
    createFoodDto: CreateFoodDto,
    userId: string,
  ): Promise<FoodResponseDto> {
    this.logger.log(`Creating food: ${createFoodDto.name}`);

    // Check if barcode already exists
    if (createFoodDto.barcode) {
      const existingFood = await this.foodRepository.findByBarcode(
        createFoodDto.barcode,
      );
      if (existingFood) {
        throw new BadRequestException('Food with this barcode already exists');
      }
    }

    const food = await this.foodRepository.create({
      ...createFoodDto,
      createdBy: userId,
    });
    return this.transformToResponseDto(food);
  }

  async findAll(query: FoodQueryDto): Promise<PaginatedFoodResponseDto> {
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
      }),
    );

    return plainToClass(PaginatedFoodResponseDto, {
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
  ): Promise<FoodResponseDto> {
    this.logger.log(`Finding food by id: ${id}`);

    const food = await this.foodRepository.findById(id);
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
  ): Promise<FoodResponseDto> {
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

  async update(
    id: string,
    updateFoodDto: UpdateFoodDto,
  ): Promise<FoodResponseDto> {
    this.logger.log(`Updating food: ${id}`);

    // Check if food exists
    const existingFood = await this.foodRepository.findById(id);
    if (!existingFood) {
      throw new NotFoundException('Food not found');
    }

    // Check if barcode already exists (excluding current food)
    if (
      updateFoodDto.barcode &&
      updateFoodDto.barcode !== existingFood.barcode
    ) {
      const existingFoodWithBarcode = await this.foodRepository.findByBarcode(
        updateFoodDto.barcode,
      );
      if (existingFoodWithBarcode && existingFoodWithBarcode.id !== id) {
        throw new BadRequestException('Food with this barcode already exists');
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
      page: searchDto.page || 1,
      pageSize: searchDto.pageSize || searchDto.limit || 10,
    };

    return await this.openFoodFactsService.searchProducts(searchOptions);
  }

  async importFromOpenFoodFacts(
    barcode: string,
    createdBy: string,
  ): Promise<FoodResponseDto> {
    this.logger.log(`Importing food from OpenFoodFacts: ${barcode}`);

    // Check if food already exists
    const existingFood = await this.foodRepository.findByBarcode(barcode);
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
    const food = await this.foodRepository.create({
      name: productInfo.name,
      description: productInfo.genericName,
      barcode: productInfo.barcode,
      createdBy,
      brands: productInfo.brands?.join(', '),
      categories: productInfo.categories || [],
      labels: productInfo.labels || [],
      quantity: productInfo.quantity,
      servingSize: productInfo.servingSize,
      ingredientsText: productInfo.ingredients,
      allergens: productInfo.allergens || [],
      traces: productInfo.traces || [],
      countries: productInfo.countries || [],
      origins: productInfo.origins,
      manufacturingPlaces: productInfo.manufacturingPlaces,
      imageUrl: productInfo.imageUrl,
      imageFrontUrl: productInfo.imageFrontUrl,
      nutritionDataPer: productInfo.nutritionDataPer,
      energyKcal100g: productInfo.nutritionalInfo?.energyKcal,
      energyKj100g: productInfo.nutritionalInfo?.energyKj,
      fat100g: productInfo.nutritionalInfo?.fat,
      saturatedFat100g: productInfo.nutritionalInfo?.saturatedFat,
      transFat100g: productInfo.nutritionalInfo?.transFat,
      cholesterol100g: productInfo.nutritionalInfo?.cholesterol,
      carbohydrates100g: productInfo.nutritionalInfo?.carbohydrates,
      sugars100g: productInfo.nutritionalInfo?.sugars,
      fiber100g: productInfo.nutritionalInfo?.fiber,
      proteins100g: productInfo.nutritionalInfo?.proteins,
      salt100g: productInfo.nutritionalInfo?.salt,
      sodium100g: productInfo.nutritionalInfo?.sodium,
      vitaminA100g: productInfo.nutritionalInfo?.vitaminA,
      vitaminC100g: productInfo.nutritionalInfo?.vitaminC,
      calcium100g: productInfo.nutritionalInfo?.calcium,
      iron100g: productInfo.nutritionalInfo?.iron,
      nutriscoreGrade: productInfo.nutritionGrade,
      novaGroup: productInfo.novaGroup,
      ecoscoreGrade: productInfo.ecoscoreGrade,
      carbonFootprint: productInfo.carbonFootprint,
      completeness: productInfo.completeness,
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

  private transformToResponseDto(food: any): FoodResponseDto {
    return plainToClass(FoodResponseDto, {
      id: food.id,
      name: food.name,
      description: food.description,
      barcode: food.barcode,
      createdAt: food.createdAt,
      updatedAt: food.updatedAt,
      createdBy: food.createdBy,

      // Product metadata
      brands: food.brands,
      categories: food.categories,
      labels: food.labels,
      quantity: food.quantity,
      servingSize: food.servingSize,
      ingredientsText: food.ingredientsText,
      allergens: food.allergens,
      traces: food.traces,
      countries: food.countries,
      origins: food.origins,
      manufacturingPlaces: food.manufacturingPlaces,
      imageUrl: food.imageUrl,
      imageFrontUrl: food.imageFrontUrl,

      // Nutriments
      nutritionDataPer: food.nutritionDataPer,
      energyKcal100g: food.energyKcal100g,
      energyKj100g: food.energyKj100g,
      fat100g: food.fat100g,
      saturatedFat100g: food.saturatedFat100g,
      transFat100g: food.transFat100g,
      cholesterol100g: food.cholesterol100g,
      carbohydrates100g: food.carbohydrates100g,
      sugars100g: food.sugars100g,
      addedSugars100g: food.addedSugars100g,
      fiber100g: food.fiber100g,
      proteins100g: food.proteins100g,
      salt100g: food.salt100g,
      sodium100g: food.sodium100g,
      vitaminA100g: food.vitaminA100g,
      vitaminC100g: food.vitaminC100g,
      calcium100g: food.calcium100g,
      iron100g: food.iron100g,
      potassium100g: food.potassium100g,
      magnesium100g: food.magnesium100g,
      zinc100g: food.zinc100g,

      // Scores
      nutriscoreGrade: food.nutriscoreGrade,
      nutriscoreScore: food.nutriscoreScore,
      novaGroup: food.novaGroup,
      ecoscoreGrade: food.ecoscoreGrade,
      carbonFootprint: food.carbonFootprint,
      nutrientLevels: food.nutrientLevels,

      // Diet analysis
      isVegan: food.isVegan,
      isVegetarian: food.isVegetarian,
      isPalmOilFree: food.isPalmOilFree,
      ingredientsAnalysisTags: food.ingredientsAnalysisTags,

      // Packaging
      packagingTags: food.packagingTags,
      packagingMaterials: food.packagingMaterials,
      packagingRecycling: food.packagingRecycling,
      packagingText: food.packagingText,

      // Quality
      completeness: food.completeness,
    });
  }
}
