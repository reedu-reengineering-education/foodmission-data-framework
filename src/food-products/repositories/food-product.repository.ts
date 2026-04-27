import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ERROR_CODES } from '../../common/utils/error.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { normalizePagination } from '../../common/utils/pagination';
import { deepCloneJson } from '../../common/utils/json.utils';
import { FoodProduct } from '@prisma/client';
import {
  FOOD_PRODUCT_WITH_RELATIONS_INCLUDE,
  FoodProductWithRelations,
} from '../../common/types/prisma-relations';
import { CreateFoodProductDto } from '../dto/create-food-product.dto';
import { UpdateFoodProductDto } from '../dto/update-food-product.dto';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';

@Injectable()
export class FoodProductRepository implements BaseRepository<
  FoodProduct,
  CreateFoodProductDto,
  UpdateFoodProductDto,
  Prisma.FoodProductWhereInput
> {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    options: FindAllOptions<
      Prisma.FoodProductWhereInput,
      Prisma.FoodProductOrderByWithRelationInput,
      Prisma.FoodProductInclude
    > = {},
  ): Promise<FoodProduct[]> {
    return await this.prisma.foodProduct.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where as Prisma.FoodProductWhereInput,
      orderBy:
        (options.orderBy as Prisma.FoodProductOrderByWithRelationInput) || {
          createdAt: 'desc',
        },
      include: options.include as Prisma.FoodProductInclude,
    });
  }

  async findById(id: string): Promise<FoodProductWithRelations | null> {
    return await this.prisma.foodProduct.findUnique({
      where: { id },
      include: FOOD_PRODUCT_WITH_RELATIONS_INCLUDE,
    });
  }

  async findByBarcode(
    barcode: string,
  ): Promise<FoodProductWithRelations | null> {
    return await this.prisma.foodProduct.findUnique({
      where: { barcode },
      include: FOOD_PRODUCT_WITH_RELATIONS_INCLUDE,
    });
  }

  async findWithPagination(
    options: FindAllOptions<
      Prisma.FoodProductWhereInput,
      Prisma.FoodProductOrderByWithRelationInput,
      Prisma.FoodProductInclude
    > = {},
  ): Promise<PaginatedResult<FoodProductWithRelations>> {
    const { skip = 0, take = 10, where, orderBy, include } = options;
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);

    const [data, total] = await Promise.all([
      this.prisma.foodProduct.findMany({
        skip: safeSkip,
        take: safeTake,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include: include || FOOD_PRODUCT_WITH_RELATIONS_INCLUDE,
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
    options: FindAllOptions<Prisma.FoodProductWhereInput> = {},
  ): Promise<FoodProduct[]> {
    return await this.prisma.foodProduct.findMany({
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

  async create(data: CreateFoodProductDto): Promise<FoodProduct> {
    try {
      const { nutrimentsRaw, nutrientLevels, ...rest } = data;
      return await this.prisma.foodProduct.create({
        data: {
          ...rest,
          nutrimentsRaw: nutrimentsRaw
            ? (deepCloneJson(nutrimentsRaw) as Prisma.InputJsonValue)
            : undefined,
          nutrientLevels: nutrientLevels
            ? (deepCloneJson(nutrientLevels) as Prisma.InputJsonValue)
            : undefined,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT) {
          throw new Error(
            'FoodProduct with this barcode or OpenFoodFacts ID already exists',
          );
        }
      }
      throw error;
    }
  }

  async update(id: string, data: UpdateFoodProductDto): Promise<FoodProduct> {
    try {
      const { nutrimentsRaw, nutrientLevels, ...rest } = data;
      return await this.prisma.foodProduct.update({
        where: { id },
        data: {
          ...rest,
          nutrimentsRaw: deepCloneJson(nutrimentsRaw),
          nutrientLevels: deepCloneJson(nutrientLevels),
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === ERROR_CODES.PRISMA_RECORD_NOT_FOUND) {
          throw new Error('FoodProduct not found');
        }
        if (error.code === ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT) {
          throw new Error(
            'FoodProduct with this barcode or OpenFoodFacts ID already exists',
          );
        }
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.foodProduct.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.FoodProductWhereInput): Promise<number> {
    return await this.prisma.foodProduct.count({ where });
  }
}
