import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProgressPrecision, UserSegment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ProgressWheelDto } from '../dto/progress-wheel.dto';
import { toProgressWheelDto } from '../progress-wheel.mapper';
import {
  getStageTarget,
  SUSTAINABILITY_WHEEL_KINDS,
  SustainabilityWheelKind,
} from '../progress-wheels.config';

const INITIAL_STAGE = 1;

@Injectable()
export class ProgressWheelService {
  constructor(private readonly prisma: PrismaService) {}

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

  // Advancing a wheel's stage and archiving completed goals happens once
  // user actions are wired to accumulate wheel progress (record -> check
  // 100% -> archive achievement -> generate next goal -> reset to 0%).
  // Deferred until that update flow is defined.
}
