import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { MealLogsRepository } from '../repositories/meal-logs.repository';
import { MealsRepository } from '../../meals/repositories/meals.repository';
import { MealItemRepository } from '../../meals/meal-items/repositories/meal-items.repository';
import { OffMongoProductRepository } from '../../food-products/repositories/off-mongo-product.repository';
import { CreateMealLogDto, MealLogFactsDto } from '../dto/create-meal-log.dto';
import { UpdateMealLogDto } from '../dto/update-meal-log.dto';
import {
  MealLogResponseDto,
  MultipleMealLogResponseDto,
} from '../dto/meal-log-response.dto';
import { QueryMealLogDto } from '../dto/query-meal-log.dto';
import { MealLog, MealLogStatus, Prisma } from '@prisma/client';
import { getOwnedEntityOrThrow } from '../../common/services/ownership-helpers';
import { handlePrismaError } from '../../common/utils/error.utils';
import {
  EventSource,
  EventType,
  EventTypeValue,
  MealFlagEventType,
  MealSwapEventType,
} from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import { toDayBucket } from '../../events/user-event.utils';
import {
  conflictingFlags,
  eventsForFlags,
  eventsForSwaps,
  swapSides,
} from '../meal-log-events';
import {
  deriveMealFlags,
  FlagSource,
  mergeDerivedFlags,
  refreshDraftFlags,
  sourcesForReviewedFlags,
} from '../derive-meal-flags';
import { ProgressWheelService } from '../../gamification/services/progress-wheel.service';
import { wheelActionsForMealLog } from '../../gamification/meal-log-wheel-actions.config';

@Injectable()
export class MealLogsService {
  private readonly logger = new Logger(MealLogsService.name);

  private resolveLoggedAt(
    persistedTimestamp: unknown,
    inputTimestamp?: string,
  ): Date {
    const fromPersisted =
      persistedTimestamp instanceof Date
        ? persistedTimestamp
        : persistedTimestamp != null
          ? new Date(persistedTimestamp as string)
          : null;
    if (fromPersisted && !Number.isNaN(fromPersisted.getTime())) {
      return fromPersisted;
    }

    if (inputTimestamp) {
      const fromInput = new Date(inputTimestamp);
      if (!Number.isNaN(fromInput.getTime())) {
        return fromInput;
      }
    }

    return new Date();
  }

  constructor(
    private readonly mealLogRepository: MealLogsRepository,
    private readonly mealRepository: MealsRepository,
    private readonly mealItemRepository: MealItemRepository,
    private readonly offMongoProductRepository: OffMongoProductRepository,
    private readonly userEventService: UserEventService,
    private readonly progressWheelService: ProgressWheelService,
  ) {}

  private getOwnedMealOrThrow(mealId: string, userId: string) {
    return getOwnedEntityOrThrow(
      mealId,
      userId,
      (id) => this.mealRepository.findById(id),
      (d) => d.userId,
      'Meal not found',
    );
  }

  private getOwnedMealLogOrThrow(logId: string, userId: string) {
    return getOwnedEntityOrThrow(
      logId,
      userId,
      (id) => this.mealLogRepository.findById(id),
      (log) => log.userId,
      'Meal log not found',
    );
  }

  async create(
    createMealLogDto: CreateMealLogDto,
    userId: string,
  ): Promise<MealLogResponseDto> {
    const { draft = false, ...dto } = createMealLogDto;
    const clientFlags = dto.flags ?? [];
    const swaps = dto.swaps ?? [];

    this.assertLoggable(dto.mealId, clientFlags, swaps);
    if (dto.mealId) {
      await this.getOwnedMealOrThrow(dto.mealId, userId);
    }

    const derived = dto.mealId ? await this.deriveFlagsForMeal(dto.mealId) : [];
    const { flags, sources } = mergeDerivedFlags(clientFlags, derived);

    let mealLog;
    try {
      mealLog = await this.mealLogRepository.create({
        ...dto,
        userId,
        flags,
        swaps,
        status: draft ? MealLogStatus.DRAFT : MealLogStatus.CONFIRMED,
        derivedFlags: derived,
        mealFromPantry: dto.mealFromPantry ?? false,
        timestamp: dto.timestamp ? new Date(dto.timestamp) : undefined,
      });
    } catch (error) {
      throw handlePrismaError(error, 'create meal log', 'MealLog');
    }

    // A draft counts toward nothing until it is confirmed.
    if (draft) {
      return this.toResponse(mealLog);
    }

    await this.recordConfirmed(
      mealLog,
      flags,
      swaps,
      sources,
      {
        ...(dto.mealId !== undefined ? { mealId: dto.mealId } : {}),
        typeOfMeal: dto.typeOfMeal,
        ...(clientFlags.length > 0 ? { flags: clientFlags } : {}),
        ...(swaps.length > 0 ? { swaps } : {}),
        ...(dto.timestamp !== undefined ? { timestamp: dto.timestamp } : {}),
        ...(dto.mealFromPantry !== undefined
          ? { mealFromPantry: dto.mealFromPantry }
          : {}),
        ...(dto.eatenOut !== undefined ? { eatenOut: dto.eatenOut } : {}),
      },
      dto.timestamp,
    );

    return this.toResponse(mealLog);
  }

  /**
   * Submits a staged log: applies the reviewed flags/swaps, flips it to
   * CONFIRMED and records its events, dated at the meal like a direct create.
   * Confirming an already confirmed log returns it unchanged.
   */
  async confirm(
    id: string,
    facts: MealLogFactsDto,
    userId: string,
  ): Promise<MealLogResponseDto> {
    const mealLog = await this.getOwnedMealLogOrThrow(id, userId);
    if (mealLog.status === MealLogStatus.CONFIRMED) {
      return this.toResponse(mealLog);
    }

    const flags = facts.flags ?? (mealLog.flags as MealFlagEventType[]);
    const swaps = facts.swaps ?? (mealLog.swaps as MealSwapEventType[]);
    this.assertLoggable(mealLog.mealId, flags, swaps);

    let flipped: boolean;
    try {
      flipped = await this.mealLogRepository.confirmDraft(id, new Date(), {
        flags,
        swaps,
      });
    } catch (error) {
      throw handlePrismaError(error, 'confirm meal log', 'MealLog');
    }
    const confirmed = await this.mealLogRepository.findById(id);
    if (!confirmed) {
      throw new NotFoundException('Meal log not found');
    }
    // A concurrent confirm got there first and records the events.
    if (!flipped) {
      return this.toResponse(confirmed);
    }

    await this.recordConfirmed(
      confirmed,
      flags,
      swaps,
      sourcesForReviewedFlags(
        flags,
        confirmed.derivedFlags as MealFlagEventType[],
      ),
      {
        ...(confirmed.mealId ? { mealId: confirmed.mealId } : {}),
        typeOfMeal: confirmed.typeOfMeal,
        ...(flags.length > 0 ? { flags } : {}),
        ...(swaps.length > 0 ? { swaps } : {}),
        timestamp: confirmed.timestamp.toISOString(),
        mealFromPantry: confirmed.mealFromPantry,
        eatenOut: confirmed.eatenOut,
        reviewed: true,
      },
    );

    return this.toResponse(confirmed);
  }

  /**
   * A log has to say *what* was eaten (a linked meal, a flag or a swap), and
   * its flags must not contradict each other.
   */
  private assertLoggable(
    mealId: string | null | undefined,
    flags: readonly MealFlagEventType[],
    swaps: readonly MealSwapEventType[],
  ): void {
    if (!mealId && flags.length === 0 && swaps.length === 0) {
      throw new BadRequestException(
        'Provide mealId, at least one diet flag in flags, or at least one swap in swaps',
      );
    }

    const conflicts = conflictingFlags([...flags]);
    if (conflicts.length > 0) {
      throw new BadRequestException(
        `Flag ${EventType.MEAL_MEAT_CONSUMED} conflicts with ${conflicts.join(', ')}`,
      );
    }
  }

  /**
   * Records what a confirmed log counts toward: MEAL_LOGGED, one fact per flag
   * and swap, and the wheel impacts. Events are dated at the meal, not the
   * request, so a catch-up log of past days lands on those days (dayBucket,
   * rule windows) on the ledger.
   */
  private async recordConfirmed(
    mealLog: MealLog,
    flags: MealFlagEventType[],
    swaps: MealSwapEventType[],
    sources: ReadonlyMap<EventTypeValue, FlagSource>,
    body: Record<string, unknown>,
    inputTimestamp?: string,
  ): Promise<void> {
    const loggedAt = this.resolveLoggedAt(mealLog.timestamp, inputTimestamp);
    const mealDayBucket = toDayBucket(loggedAt);

    // Best-effort: the meal log is already persisted, so a failure recording
    // the event must not surface as a create failure (the client would retry
    // a call that already succeeded, creating a duplicate meal log).
    try {
      await this.userEventService.record({
        userId: mealLog.userId,
        eventType: EventType.MEAL_LOGGED,
        source: EventSource.MEAL_LOG,
        metadata: {
          mealLogId: mealLog.id,
          mealId: mealLog.mealId,
          mealDayBucket,
          source: EventSource.API,
          body,
        },
        idempotencyKey: `meal-logged:${mealLog.id}`,
        createdAt: loggedAt,
      });
    } catch (error) {
      this.logger.error(
        `Failed to record MEAL_LOGGED event for meal log ${mealLog.id}`,
        error instanceof Error ? error.stack : error,
      );
    }

    await this.recordFlagEvents(
      mealLog,
      flags,
      sources,
      swaps,
      loggedAt,
      mealDayBucket,
    );
    await this.recordWheelImpacts(mealLog, flags, swaps);
  }

  /**
   * Diet flags implied by the meal's items and, for a meal based on a recipe,
   * the recipe's ingredients (NEVO foods and OFF products). OFF
   * tags are read from the OFF Mongo copy because imported `FoodProduct` rows
   * don't keep them; the lookup is best-effort and falls back to stored data.
   * Any failure here logs and yields no derived flags rather than failing the
   * meal log.
   */
  private async deriveFlagsForMeal(
    mealId: string,
  ): Promise<MealFlagEventType[]> {
    return (await this.tryDeriveFlagsForMeal(mealId)) ?? [];
  }

  /** Like deriveFlagsForMeal, but `null` on a failure instead of `[]`. */
  private async tryDeriveFlagsForMeal(
    mealId: string,
  ): Promise<MealFlagEventType[] | null> {
    try {
      // A meal based on a recipe is made of its own items plus the recipe's
      // ingredients (which aren't copied into meal items).
      const [mealItems, recipeIngredients] = await Promise.all([
        this.mealItemRepository.findByMealId(mealId),
        this.mealItemRepository.findRecipeIngredientFoodsByMealId(mealId),
      ]);
      const items = [...mealItems, ...recipeIngredients];
      const barcodes = [
        ...new Set(
          items
            .map((item) => item.foodProduct?.barcode)
            .filter((barcode): barcode is string => !!barcode),
        ),
      ];
      const offFacts =
        await this.offMongoProductRepository.findMealFactsByBarcodes(barcodes);
      return deriveMealFlags(items, offFacts);
    } catch (error) {
      this.logger.error(
        `Failed to derive meal flags for meal ${mealId}`,
        error instanceof Error ? error.stack : error,
      );
      return null;
    }
  }

  /**
   * One `MEAL_*` / `NUTRITION_*` / `FOOD_WASTE_*` / `SWAP_*` fact per reported flag and swap. Keyed by meal log id
   * so a retried create (same log) never double-counts toward missions or rewards.
   * Best-effort for the same reason as `MEAL_LOGGED`.
   */
  private async recordFlagEvents(
    mealLog: MealLog,
    flags: MealFlagEventType[],
    sources: ReadonlyMap<EventTypeValue, FlagSource>,
    swaps: MealSwapEventType[],
    loggedAt: Date,
    mealDayBucket: string,
  ): Promise<void> {
    for (const eventType of eventsForFlags(flags)) {
      await this.recordBehaviouralEvent(mealLog, eventType, loggedAt, {
        mealLogId: mealLog.id,
        mealId: mealLog.mealId,
        mealType: mealLog.typeOfMeal,
        mealDayBucket,
        flags,
        flagSource: sources.get(eventType) ?? 'user',
      });
    }

    for (const eventType of eventsForSwaps(swaps)) {
      await this.recordBehaviouralEvent(mealLog, eventType, loggedAt, {
        mealLogId: mealLog.id,
        mealId: mealLog.mealId,
        mealType: mealLog.typeOfMeal,
        mealDayBucket,
        ...swapSides(eventType),
      });
    }
  }

  /**
   * Moves the sustainability wheels for what this log reports (vegan or
   * vegetarian meal, swaps, plate/expired food saved). Runs once per new meal
   * log, so a retry can't double-count. Best-effort like the events above.
   * Users who haven't done the onboarding survey yet move their default
   * BEGINNER wheels.
   */
  private async recordWheelImpacts(
    mealLog: MealLog,
    flags: MealFlagEventType[],
    swaps: MealSwapEventType[],
  ): Promise<void> {
    for (const actionCode of wheelActionsForMealLog(flags, swaps)) {
      try {
        await this.progressWheelService.recordImpact(
          mealLog.userId,
          actionCode,
          {
            source: EventSource.MEAL_LOG,
            subject: { type: 'MEAL_LOG', id: mealLog.id },
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to record wheel impact ${actionCode} for meal log ${mealLog.id}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }

  private async recordBehaviouralEvent(
    mealLog: MealLog,
    eventType: EventTypeValue,
    loggedAt: Date,
    metadata: Record<string, unknown>,
    idempotencyKey = `${eventType}:${mealLog.id}`,
  ): Promise<void> {
    try {
      await this.userEventService.record({
        userId: mealLog.userId,
        eventType,
        source: EventSource.MEAL_LOG,
        metadata,
        idempotencyKey,
        createdAt: loggedAt,
      });
    } catch (error) {
      this.logger.error(
        `Failed to record ${eventType} event for meal log ${mealLog.id}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async findAll(
    userId: string,
    query: QueryMealLogDto,
  ): Promise<MultipleMealLogResponseDto> {
    const {
      page = 1,
      limit = 10,
      dateFrom,
      dateTo,
      typeOfMeal,
      mealFromPantry,
      eatenOut,
      status = MealLogStatus.CONFIRMED,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MealLogWhereInput = {
      userId,
      status,
      ...(typeOfMeal ? { typeOfMeal } : {}),
      ...(mealFromPantry !== undefined ? { mealFromPantry } : {}),
      ...(eatenOut !== undefined ? { eatenOut } : {}),
      ...(dateFrom || dateTo
        ? {
            timestamp: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    try {
      const result = await this.mealLogRepository.findWithPagination({
        skip,
        take: limit,
        where,
        orderBy: { timestamp: 'desc' },
        include: { meal: true },
      });

      return plainToInstance(
        MultipleMealLogResponseDto,
        {
          data: result.data.map((log) => this.toResponse(log)),
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      throw handlePrismaError(error, 'find meal logs', 'MealLog');
    }
  }

  async findOne(id: string, userId: string): Promise<MealLogResponseDto> {
    const ownedMealLog = await this.getOwnedMealLogOrThrow(id, userId);
    return this.toResponse(await this.refreshDraftProposals(ownedMealLog));
  }

  /**
   * The meal's items may have changed since a draft was created, so a fetched
   * draft is derived again and its proposals updated (see refreshDraftFlags).
   * Confirmed logs and quick logs are returned as they are. Best-effort: on a
   * failure the stored draft is returned.
   */
  private async refreshDraftProposals(mealLog: MealLog): Promise<MealLog> {
    if (mealLog.status !== MealLogStatus.DRAFT || !mealLog.mealId) {
      return mealLog;
    }

    const oldDerived = mealLog.derivedFlags as MealFlagEventType[];
    // A failed derivation must not read as "no proposals any more".
    const derived = await this.tryDeriveFlagsForMeal(mealLog.mealId);
    if (!derived) {
      return mealLog;
    }
    const unchanged =
      derived.length === oldDerived.length &&
      derived.every((flag) => oldDerived.includes(flag));
    if (unchanged) {
      return mealLog;
    }

    try {
      return await this.mealLogRepository.update(mealLog.id, {
        flags: refreshDraftFlags(
          mealLog.flags as MealFlagEventType[],
          oldDerived,
          derived,
        ),
        derivedFlags: derived,
      });
    } catch (error) {
      this.logger.error(
        `Failed to refresh derived flags for draft meal log ${mealLog.id}`,
        error instanceof Error ? error.stack : error,
      );
      return mealLog;
    }
  }

  async update(
    id: string,
    updateMealLogDto: UpdateMealLogDto,
    userId: string,
  ): Promise<MealLogResponseDto> {
    const mealLog = await this.getOwnedMealLogOrThrow(id, userId);
    const { flags: newFlags, swaps: newSwaps, ...fields } = updateMealLogDto;
    const isDraft = mealLog.status === MealLogStatus.DRAFT;

    // On a confirmed log `flags` and `swaps` recorded events, and that ledger
    // is append-only, so what a log claims and what was counted stay the same
    // thing. Only a draft (nothing recorded yet) can change them.
    if (!isDraft && (newFlags !== undefined || newSwaps !== undefined)) {
      throw new BadRequestException(
        'flags and swaps can only be changed on a DRAFT meal log',
      );
    }

    const mealChanged = !!fields.mealId && fields.mealId !== mealLog.mealId;
    if (mealChanged) {
      await this.getOwnedMealOrThrow(fields.mealId!, userId);
    }

    let facts: {
      flags?: MealFlagEventType[];
      swaps?: MealSwapEventType[];
      derivedFlags?: MealFlagEventType[];
    } = {};
    if (isDraft) {
      const oldDerived = mealLog.derivedFlags as MealFlagEventType[];
      let flags = newFlags ?? (mealLog.flags as MealFlagEventType[]);
      let derivedFlags = oldDerived;
      if (mealChanged) {
        derivedFlags = await this.deriveFlagsForMeal(fields.mealId!);
        // Keep what the user added, swap the old meal's proposals for the
        // new meal's — unless the request names the flags itself.
        if (newFlags === undefined) {
          const userAdded = flags.filter((flag) => !oldDerived.includes(flag));
          flags = mergeDerivedFlags(userAdded, derivedFlags).flags;
        }
      }
      const swaps = newSwaps ?? (mealLog.swaps as MealSwapEventType[]);
      this.assertLoggable(fields.mealId ?? mealLog.mealId, flags, swaps);
      facts = { flags, swaps, derivedFlags };
    }

    try {
      const updated = await this.mealLogRepository.update(id, {
        ...fields,
        ...facts,
        timestamp: fields.timestamp ? new Date(fields.timestamp) : undefined,
      });

      return this.toResponse(updated);
    } catch (error) {
      throw handlePrismaError(error, 'update meal log', 'MealLog');
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getOwnedMealLogOrThrow(id, userId);
    try {
      await this.mealLogRepository.delete(id);
    } catch (error) {
      throw handlePrismaError(error, 'delete meal log', 'MealLog');
    }
  }

  private toResponse(log: any): MealLogResponseDto {
    return plainToInstance(MealLogResponseDto, log, {
      excludeExtraneousValues: true,
    });
  }
}
