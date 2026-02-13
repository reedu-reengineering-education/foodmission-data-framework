import { Injectable } from '@nestjs/common';
import {
  FoodWaste,
  Prisma,
  WasteReason,
  DetectionMethod,
  Unit,
} from '@prisma/client';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';
import { PrismaService } from '../../database/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';

export interface CreateFoodWasteData {
  userId: string;
  pantryItemId?: string;
  foodId: string;
  quantity: number;
  unit: Unit;
  wasteReason: WasteReason;
  detectionMethod: DetectionMethod;
  notes?: string;
  costEstimate?: number;
  carbonFootprint?: number;
  wastedAt: Date;
}

export type UpdateFoodWasteData = Partial<
  Omit<CreateFoodWasteData, 'userId' | 'detectionMethod'>
>;

export interface FoodWasteStatistics {
  totalWaste: number;
  totalCost: number;
  totalCarbon: number;
  wasteByReason: Record<WasteReason, number>;
  wasteByMethod: Record<DetectionMethod, number>;
  mostWastedFoods: Array<{
    foodId: string;
    foodName: string;
    totalQuantity: number;
    count: number;
  }>;
}

@Injectable()
export class FoodWasteRepository
  implements
    BaseRepository<
      FoodWaste,
      CreateFoodWasteData,
      UpdateFoodWasteData,
      Prisma.FoodWasteWhereInput
    >
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    options: FindAllOptions<
      Prisma.FoodWasteWhereInput,
      Prisma.FoodWasteOrderByWithRelationInput,
      Prisma.FoodWasteInclude
    > = {},
  ): Promise<FoodWaste[]> {
    return await this.prisma.foodWaste.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy || { wastedAt: 'desc' },
      include: options.include,
    });
  }

  async findWithPagination(
    options: FindAllOptions<
      Prisma.FoodWasteWhereInput,
      Prisma.FoodWasteOrderByWithRelationInput,
      Prisma.FoodWasteInclude
    > = {},
  ): Promise<PaginatedResult<FoodWaste>> {
    const { skip = 0, take = 10, where, orderBy, include } = options;
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);

    const [data, total] = await Promise.all([
      this.prisma.foodWaste.findMany({
        skip: safeSkip,
        take: safeTake,
        where,
        orderBy: orderBy || { wastedAt: 'desc' },
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

  async findById(id: string): Promise<FoodWaste | null> {
    return await this.prisma.foodWaste.findUnique({
      where: { id },
      include: {
        food: true,
        pantryItem: true,
      } as Prisma.FoodWasteInclude,
    });
  }

  async create(data: CreateFoodWasteData): Promise<FoodWaste> {
    return await this.prisma.foodWaste.create({
      data: data as Prisma.FoodWasteUncheckedCreateInput,
      include: {
        food: true,
        pantryItem: true,
      } as Prisma.FoodWasteInclude,
    });
  }

  async update(id: string, data: UpdateFoodWasteData): Promise<FoodWaste> {
    return await this.prisma.foodWaste.update({
      where: { id },
      data: data as Prisma.FoodWasteUncheckedUpdateInput,
      include: {
        food: true,
        pantryItem: true,
      } as Prisma.FoodWasteInclude,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.foodWaste.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.FoodWasteWhereInput): Promise<number> {
    return await this.prisma.foodWaste.count({ where });
  }

  /**
   * Get aggregated statistics for food waste
   */
  async getStatistics(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<FoodWasteStatistics> {
    const where: Prisma.FoodWasteWhereInput = {
      userId,
      ...(dateFrom || dateTo
        ? {
            wastedAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    };

    // Get all waste records for the period
    const wasteRecords = await this.prisma.foodWaste.findMany({
      where,
      include: {
        food: true,
      },
    });

    // Calculate totals
    const totalWaste = wasteRecords.reduce(
      (sum, record) => sum + record.quantity,
      0,
    );
    const totalCost = wasteRecords.reduce(
      (sum, record) => sum + (record.costEstimate || 0),
      0,
    );
    const totalCarbon = wasteRecords.reduce(
      (sum, record) => sum + (record.carbonFootprint || 0),
      0,
    );

    // Group by waste reason
    const wasteByReason = wasteRecords.reduce(
      (acc, record) => {
        acc[record.wasteReason] = (acc[record.wasteReason] || 0) + 1;
        return acc;
      },
      {} as Record<WasteReason, number>,
    );

    // Group by detection method
    const wasteByMethod = wasteRecords.reduce(
      (acc, record) => {
        acc[record.detectionMethod] = (acc[record.detectionMethod] || 0) + 1;
        return acc;
      },
      {} as Record<DetectionMethod, number>,
    );

    // Find most wasted foods
    const foodWasteMap = wasteRecords.reduce(
      (acc, record) => {
        if (!acc[record.foodId]) {
          acc[record.foodId] = {
            foodId: record.foodId,
            foodName: record.food.name,
            totalQuantity: 0,
            count: 0,
          };
        }
        acc[record.foodId].totalQuantity += record.quantity;
        acc[record.foodId].count += 1;
        return acc;
      },
      {} as Record<string, any>,
    );

    const mostWastedFoods = Object.values(foodWasteMap)
      .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    return {
      totalWaste,
      totalCost,
      totalCarbon,
      wasteByReason,
      wasteByMethod,
      mostWastedFoods,
    };
  }

  /**
   * Get waste trends over time
   */
  async getTrends(
    userId: string,
    dateFrom: Date,
    dateTo: Date,
    interval: 'day' | 'week' | 'month' = 'day',
  ): Promise<
    Array<{
      date: Date;
      totalWaste: number;
      totalCost: number;
      totalCarbon: number;
      count: number;
    }>
  > {
    const where: Prisma.FoodWasteWhereInput = {
      userId,
      wastedAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    const wasteRecords = await this.prisma.foodWaste.findMany({
      where,
      orderBy: { wastedAt: 'asc' },
    });

    // Group by interval
    const grouped: Record<string, any> = {};

    wasteRecords.forEach((record) => {
      let key: string;
      const date = new Date(record.wastedAt);

      switch (interval) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!grouped[key]) {
        grouped[key] = {
          date: new Date(key),
          totalWaste: 0,
          totalCost: 0,
          totalCarbon: 0,
          count: 0,
        };
      }

      grouped[key].totalWaste += record.quantity;
      grouped[key].totalCost += record.costEstimate || 0;
      grouped[key].totalCarbon += record.carbonFootprint || 0;
      grouped[key].count += 1;
    });

    return Object.values(grouped).sort(
      (a: any, b: any) => a.date.getTime() - b.date.getTime(),
    );
  }
}
