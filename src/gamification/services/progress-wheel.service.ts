import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProgressIndicator,
  ProgressPrecision,
  UserSegment,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  EventSource,
  EventSourceValue,
  EventSubject,
  EventType,
} from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import { ProgressWheelDto } from '../dto/progress-wheel.dto';
import { RecordWheelImpactResultDto } from '../dto/wheel-impact.dto';
import { toProgressWheelDto } from '../progress-wheel.mapper';
import {
  getStageTarget,
  STAGES_PER_PROFILE,
  SUSTAINABILITY_WHEEL_KINDS,
  SustainabilityWheelKind,
} from '../progress-wheels.config';
import { getWheelImpactAction } from '../wheel-impact-actions.config';

const INITIAL_STAGE = 1;

type LockedIndicatorRow = {
  id: string;
  level: number;
  accumulatedValue: number;
  targetValue: number;
  allTimeTotal: number;
};

interface WheelImpactUpdate {
  kind: SustainabilityWheelKind;
  delta: number;
  stagesCompleted: number;
  /** Completed a stage while already at STAGES_PER_PROFILE — dimension promotion candidate. */
  hitCapAtMaxStage: boolean;
  row: ProgressIndicator;
}

interface DimensionPromotion {
  from: UserSegment;
  to: UserSegment;
}

/** BEGINNER -> INTERMEDIATE -> ADVANCED; null once already at the ceiling. */
function promoteSegment(current: UserSegment): UserSegment | null {
  if (current === UserSegment.BEGINNER) return UserSegment.INTERMEDIATE;
  if (current === UserSegment.INTERMEDIATE) return UserSegment.ADVANCED;
  return null;
}

@Injectable()
export class ProgressWheelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userEventService: UserEventService,
  ) {}

  /**
   * Creates the four sustainability wheels for a user at stage 1 of their
   * profile, if they don't already exist. Safe to call repeatedly (e.g. once
   * at onboarding, and lazily whenever wheels are read).
   */
  async ensureWheelsForUser(
    userId: string,
    profile: UserSegment,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    await Promise.all(
      SUSTAINABILITY_WHEEL_KINDS.map((kind) =>
        tx.progressIndicator.upsert({
          where: { userId_kind: { userId, kind } },
          update: {},
          create: {
            userId,
            kind,
            precision: ProgressPrecision.SOFT,
            level: INITIAL_STAGE,
            accumulatedValue: 0,
            targetValue: getStageTarget(kind, profile, INITIAL_STAGE),
          },
        }),
      ),
    );
  }

  /** Ensures the wheels exist, then returns them for display. */
  async getWheelsForUser(userId: string): Promise<ProgressWheelDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { segment: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Segment is chosen by the client at onboarding; a user without one yet
    // has no wheels to show.
    if (!user.segment) {
      return [];
    }

    await this.ensureWheelsForUser(userId, user.segment);

    const rows = await this.prisma.progressIndicator.findMany({
      where: { userId, kind: { in: [...SUSTAINABILITY_WHEEL_KINDS] } },
      orderBy: { kind: 'asc' },
    });

    return rows.map((row) =>
      toProgressWheelDto(
        { ...row, kind: row.kind as SustainabilityWheelKind },
        user.segment as UserSegment,
      ),
    );
  }

  /**
   * Applies a validated action's impact to every wheel it affects: adds the
   * delta to accumulatedValue/allTimeTotal, and rolls over any wheel that
   * crosses 100% (archive the stage, generate the next goal, reset to 0%) —
   * the "continuous-improvement" cycle. Rows are locked FOR UPDATE inside a
   * transaction so concurrent actions can't lose an increment, same approach
   * as GamificationWalletService.award().
   *
   * A wheel that completes a stage while already at STAGES_PER_PROFILE
   * promotes the user's overall dimension instead of just repeating stage 5
   * (BEGINNER -> INTERMEDIATE -> ADVANCED). Dimension is a single value per
   * user (not per wheel), so a promotion resets all four wheels to stage 1
   * of the new dimension — a fresh progression cycle for the whole profile,
   * not just the wheel that triggered it. ADVANCED has no ceiling above it;
   * its stage 5 keeps repeating.
   */
  async recordImpact(
    userId: string,
    actionCode: string,
    options?: { source?: EventSourceValue; subject?: EventSubject },
  ): Promise<RecordWheelImpactResultDto> {
    let action;
    try {
      action = getWheelImpactAction(actionCode);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown wheel impact action',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { segment: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.segment) {
      throw new BadRequestException(
        'User has no sustainability profile yet — complete onboarding first',
      );
    }
    const segment = user.segment;

    await this.ensureWheelsForUser(userId, segment);

    const outcome = await this.prisma.$transaction(async (tx) => {
      const results: WheelImpactUpdate[] = [];

      for (const kind of SUSTAINABILITY_WHEEL_KINDS) {
        const delta = action.impact[kind];
        if (delta == null) continue;
        results.push(
          await this.applyImpactToWheel(tx, userId, kind, delta, segment),
        );
      }

      let dimensionPromotion: DimensionPromotion | null = null;
      let effectiveSegment = segment;
      let finalRows = results.map((r) => r.row);

      if (results.some((r) => r.hitCapAtMaxStage)) {
        const nextSegment = promoteSegment(segment);
        if (nextSegment) {
          dimensionPromotion = { from: segment, to: nextSegment };
          effectiveSegment = nextSegment;

          await tx.user.update({
            where: { id: userId },
            data: { segment: nextSegment },
          });

          finalRows = await Promise.all(
            SUSTAINABILITY_WHEEL_KINDS.map((kind) =>
              tx.progressIndicator.update({
                where: { userId_kind: { userId, kind } },
                data: {
                  level: INITIAL_STAGE,
                  accumulatedValue: 0,
                  targetValue: getStageTarget(kind, nextSegment, INITIAL_STAGE),
                  cycleStartedAt: new Date(),
                },
              }),
            ),
          );
        }
      }

      await this.userEventService.record(
        {
          userId,
          eventType: EventType.PROGRESS_INDICATOR_UPDATED,
          source: options?.source ?? EventSource.GAME,
          subject: options?.subject,
          metadata: {
            actionCode: action.code,
            wheels: results.map((r) => ({
              kind: r.kind,
              delta: r.delta,
              level: r.row.level,
              accumulatedValue: r.row.accumulatedValue,
              targetValue: r.row.targetValue,
              stagesCompleted: r.stagesCompleted,
            })),
            ...(dimensionPromotion ? { dimensionPromotion } : {}),
          },
        },
        tx,
      );

      return { results, dimensionPromotion, effectiveSegment, finalRows };
    });

    return {
      actionCode: action.code,
      wheels: outcome.finalRows.map((row) =>
        toProgressWheelDto(
          { ...row, kind: row.kind as SustainabilityWheelKind },
          outcome.effectiveSegment,
        ),
      ),
      achievements: outcome.results
        .filter((r) => r.stagesCompleted > 0)
        .map((r) => ({ kind: r.kind, stagesCompleted: r.stagesCompleted })),
      dimensionPromotion: outcome.dimensionPromotion,
    };
  }

  private async applyImpactToWheel(
    tx: Prisma.TransactionClient,
    userId: string,
    kind: SustainabilityWheelKind,
    delta: number,
    segment: UserSegment,
  ): Promise<WheelImpactUpdate> {
    const locked = await tx.$queryRaw<LockedIndicatorRow[]>`
      SELECT id, level, "accumulatedValue", "targetValue", "allTimeTotal"
      FROM "progress_indicators"
      WHERE "userId" = ${userId} AND kind = ${kind}::"ProgressIndicatorKind"
      FOR UPDATE
    `;
    const current = locked[0];
    if (!current) {
      throw new NotFoundException(
        `No ${kind} wheel for user ${userId} — ensureWheelsForUser must run first`,
      );
    }

    let { level, accumulatedValue, targetValue } = current;
    const allTimeTotal = current.allTimeTotal + delta;
    accumulatedValue += delta;

    let stagesCompleted = 0;
    let hitCapAtMaxStage = false;
    // Bounded by STAGES_PER_PROFILE as a safety net against runaway loops;
    // in practice a single action's delta is far smaller than a stage target.
    while (
      accumulatedValue >= targetValue &&
      stagesCompleted < STAGES_PER_PROFILE
    ) {
      accumulatedValue -= targetValue;
      const nextLevel = Math.min(level + 1, STAGES_PER_PROFILE);
      const leveled = nextLevel !== level;
      level = nextLevel;
      targetValue = getStageTarget(kind, segment, level);
      stagesCompleted += 1;
      // Already at the max stage — recordImpact() promotes the dimension
      // when this happens (see its docstring); if the user is already
      // ADVANCED there's nowhere higher to go, so stage 5 just repeats.
      if (!leveled) {
        hitCapAtMaxStage = true;
        break;
      }
    }

    const updated = await tx.progressIndicator.update({
      where: { id: current.id },
      data: {
        level,
        accumulatedValue,
        targetValue,
        allTimeTotal,
        ...(stagesCompleted > 0 ? { cycleStartedAt: new Date() } : {}),
      },
    });

    return {
      kind,
      delta,
      stagesCompleted,
      hitCapAtMaxStage,
      row: updated,
    };
  }
}
