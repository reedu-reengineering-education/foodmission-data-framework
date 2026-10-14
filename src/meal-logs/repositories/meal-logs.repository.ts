import { Injectable } from '@nestjs/common';
import { MealLog, MealLogStatus, Prisma, TypeOfMeal } from '@prisma/client';
import { MealFlagEventType, MealSwapEventType } from '../../events/event-types';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';
import { PrismaService } from '../../database/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';

export interface CreateMealLogData {
  userId: string;
  /** Omitted for quick logs — the meal is described by `flags` instead. */
  mealId?: string | null;
  typeOfMeal: TypeOfMeal;
  timestamp?: Date;
  mealFromPantry?: boolean;
  eatenOut?: boolean;
  flags?: MealFlagEventType[];
  swaps?: MealSwapEventType[];
  status?: MealLogStatus;
  derivedFlags?: MealFlagEventType[];
}

export type UpdateMealLogData = Partial<
  Omit<CreateMealLogData, 'userId' | 'status'>
>;

@Injectable()
export class MealLogsRepository implements BaseRepository<
  MealLog,
  CreateMealLogData,
  UpdateMealLogData,
  Prisma.MealLogWhereInput
> {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    options: FindAllOptions<
      Prisma.MealLogWhereInput,
      Prisma.MealLogOrderByWithRelationInput,
      Prisma.MealLogInclude
    > = {},
  ): Promise<MealLog[]> {
    return this.prisma.mealLog.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy || { timestamp: 'desc' },
      include: options.include,
    });
  }

  async findWithPagination(
    options: FindAllOptions<
      Prisma.MealLogWhereInput,
      Prisma.MealLogOrderByWithRelationInput,
      Prisma.MealLogInclude
    > = {},
  ): Promise<PaginatedResult<MealLog>> {
    const { skip = 0, take = 10, where, orderBy, include } = options;
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);

    const [data, total] = await Promise.all([
      this.prisma.mealLog.findMany({
        skip: safeSkip,
        take: safeTake,
        where,
        orderBy: orderBy || { timestamp: 'desc' },
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

  async findById(id: string): Promise<MealLog | null> {
    return this.prisma.mealLog.findUnique({
      where: { id },
      include: { meal: true },
    });
  }

  async create(data: CreateMealLogData): Promise<MealLog> {
    return this.prisma.mealLog.create({
      data: data,
      include: { meal: true },
    });
  }

  async update(id: string, data: UpdateMealLogData): Promise<MealLog> {
    return this.prisma.mealLog.update({
      where: { id },
      data: data,
      include: { meal: true },
    });
  }

  /**
   * DRAFT → CONFIRMED, guarded on the status so concurrent confirms flip it
   * once. Returns whether this call did the flip.
   */
  async confirmDraft(
    id: string,
    confirmedAt: Date,
    facts: { flags: MealFlagEventType[]; swaps: MealSwapEventType[] },
  ): Promise<boolean> {
    // The final facts are written in the same guarded update, so a concurrent
    // confirm can't change a log that is already confirmed.
    const { count } = await this.prisma.mealLog.updateMany({
      where: { id, status: MealLogStatus.DRAFT },
      data: { ...facts, status: MealLogStatus.CONFIRMED, confirmedAt },
    });
    return count > 0;
  }

  /** Removes drafts created before `before`; they never recorded events. */
  async deleteDraftsCreatedBefore(before: Date): Promise<number> {
    const { count } = await this.prisma.mealLog.deleteMany({
      where: { status: MealLogStatus.DRAFT, createdAt: { lt: before } },
    });
    return count;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.mealLog.delete({ where: { id } });
  }

  async count(where?: Prisma.MealLogWhereInput): Promise<number> {
    return this.prisma.mealLog.count({ where });
  }
}
