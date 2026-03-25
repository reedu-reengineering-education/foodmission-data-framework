import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ERROR_CODES } from '../../common/utils/error.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { normalizePagination } from '../../common/utils/pagination';

type Food = Awaited<ReturnType<PrismaService['food']['create']>>;
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';

export interface CreateFoodDto {
  name: string;
  description?: string;
  barcode?: string;
  createdBy: string;

  // Product metadata
  brands?: string;
  categories?: string[];
  labels?: string[];
  quantity?: string;
  servingSize?: string;
  ingredientsText?: string;
  allergens?: string[];
  traces?: string[];
  countries?: string[];
  origins?: string;
  manufacturingPlaces?: string;
  imageUrl?: string;
  imageFrontUrl?: string;

  // Nutriments per 100g
  nutritionDataPer?: string;
  energyKcal?: number;
  energyKj?: number;
  fat?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  carbohydrates?: number;
  sugars?: number;
  addedSugars?: number;
  fiber?: number;
  proteins?: number;
  salt?: number;
  sodium?: number;
  vitaminA?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  magnesium?: number;
  zinc?: number;
  nutrimentsRaw?: any;

  // Scores
  nutriscoreGrade?: string;
  nutriscoreScore?: number;
  novaGroup?: number;
  ecoscoreGrade?: string;
  carbonFootprint?: number;
  nutrientLevels?: any;

  // Diet analysis
  isVegan?: boolean;
  isVegetarian?: boolean;
  isPalmOilFree?: boolean;
  ingredientsAnalysisTags?: string[];

  // Packaging
  packagingTags?: string[];
  packagingMaterials?: string[];
  packagingRecycling?: string[];
  packagingText?: string;

  // Data quality
  completeness?: number;
}

export interface UpdateFoodDto {
  name?: string;
  description?: string;
  barcode?: string;

  brands?: string;
  categories?: string[];
  labels?: string[];
  quantity?: string;
  servingSize?: string;
  ingredientsText?: string;
  allergens?: string[];
  traces?: string[];
  countries?: string[];
  origins?: string;
  manufacturingPlaces?: string;
  imageUrl?: string;
  imageFrontUrl?: string;

  nutritionDataPer?: string;
  energyKcal?: number;
  energyKj?: number;
  fat?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  carbohydrates?: number;
  sugars?: number;
  addedSugars?: number;
  fiber?: number;
  proteins?: number;
  salt?: number;
  sodium?: number;
  vitaminA?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  magnesium?: number;
  zinc?: number;
  nutrimentsRaw?: any;

  nutriscoreGrade?: string;
  nutriscoreScore?: number;
  novaGroup?: number;
  ecoscoreGrade?: string;
  carbonFootprint?: number;
  nutrientLevels?: any;

  isVegan?: boolean;
  isVegetarian?: boolean;
  isPalmOilFree?: boolean;
  ingredientsAnalysisTags?: string[];

  packagingTags?: string[];
  packagingMaterials?: string[];
  packagingRecycling?: string[];
  packagingText?: string;

  completeness?: number;
}

@Injectable()
export class FoodRepository implements BaseRepository<
  Food,
  CreateFoodDto,
  UpdateFoodDto,
  Prisma.FoodWhereInput
> {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    options: FindAllOptions<
      Prisma.FoodWhereInput,
      Prisma.FoodOrderByWithRelationInput,
      Prisma.FoodInclude
    > = {},
  ): Promise<Food[]> {
    return await this.prisma.food.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy || { createdAt: 'desc' },
      include: options.include,
    });
  }

  async findById(id: string): Promise<Food | null> {
    return await this.prisma.food.findUnique({
      where: { id },
    });
  }

  async findByBarcode(barcode: string): Promise<Food | null> {
    return await this.prisma.food.findUnique({
      where: { barcode },
    });
  }

  async findWithPagination(
    options: FindAllOptions<
      Prisma.FoodWhereInput,
      Prisma.FoodOrderByWithRelationInput,
      Prisma.FoodInclude
    > = {},
  ): Promise<PaginatedResult<Food>> {
    const { skip = 0, take = 10, where, orderBy, include } = options;
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);

    const [data, total] = await Promise.all([
      this.prisma.food.findMany({
        skip: safeSkip,
        take: safeTake,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include,
      }),
      this.count(where),
    ]);

    const page = Math.floor(safeSkip / safeTake) + 1;
    const totalPages = Math.ceil(total / safeTake);

    return {
      data,
      total,
      page,
      limit: safeTake,
      totalPages,
    };
  }

  async searchByName(
    name: string,
    options: FindAllOptions<Prisma.FoodWhereInput> = {},
  ): Promise<Food[]> {
    return await this.prisma.food.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
        ...(options.where || {}),
      },
      skip: options.skip,
      take: options.take,
      orderBy: options.orderBy || { createdAt: 'desc' },
    });
  }

  async create(data: CreateFoodDto): Promise<Food> {
    try {
      return await this.prisma.food.create({
        data,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT) {
          throw new Error(
            'Food with this barcode or OpenFoodFacts ID already exists',
          );
        }
      }
      throw error;
    }
  }

  async update(id: string, data: UpdateFoodDto): Promise<Food> {
    try {
      return await this.prisma.food.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === ERROR_CODES.PRISMA_RECORD_NOT_FOUND) {
          throw new Error('Food not found');
        }
        if (error.code === ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT) {
          throw new Error(
            'Food with this barcode or OpenFoodFacts ID already exists',
          );
        }
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.food.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.FoodWhereInput): Promise<number> {
    return await this.prisma.food.count({ where });
  }
}
