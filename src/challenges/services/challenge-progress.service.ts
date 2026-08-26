import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';
import { PaginatedLangQueryDto } from '../../learning/dto/paginated-lang-query.dto';
import { overlayTitles } from '../../learning/utils/overlay-titles';
import { toPaginatedResponseDto } from '../../learning/utils/paginated';
import { TranslationService } from '../../translations/services/translation.service';
import { EventSource, EventType } from '../../events/event-types';
import {
  RecordUserEventInput,
  UserEventService,
} from '../../events/services/user-event.service';
import { ChallengeProgressRepository } from '../repositories/challenge-progress.repository';
import { UpdateChallengeProgressDto } from '../dto/update-challenge-progress.dto';
import { ChallengeProgressResponseDto } from '../dto/response-challenge-progress.dto';

type ChallengeProgressRow = {
  challengeId: string;
  userId: string;
  completed: boolean;
  progress: number;
  challenge?: { title?: string } | null;
};

@Injectable()
export class ChallengeProgressService {
  private readonly logger = new Logger(ChallengeProgressService.name);

  constructor(
    private readonly challengeProgressRepository: ChallengeProgressRepository,
    private readonly translationService: TranslationService,
    private readonly userEventService: UserEventService,
  ) {}

  async getChallengeById(
    codeOrId: string,
    userId: string,
    lang?: string,
  ): Promise<ChallengeProgressResponseDto> {
    this.logger.log(`Getting challenge ${codeOrId} for user: ${userId}`);

    const challenge = await this.requireChallenge(codeOrId);

    const progress =
      await this.challengeProgressRepository.findByUserIdAndChallengeId(
        userId,
        challenge.id,
      );

    if (!progress) {
      const titles = await overlayTitles(
        this.translationService,
        'Challenge',
        [{ id: challenge.id, title: challenge.title }],
        lang,
      );
      return {
        challengeId: challenge.id,
        userId,
        completed: false,
        progress: 0,
        challengeTitle: titles[challenge.id],
      };
    }

    return this.mapRowsToDtos([progress], lang).then((rows) => rows[0]);
  }

  async getAllChallengesByUserId(
    userId: string,
    lang?: string,
  ): Promise<ChallengeProgressResponseDto[]> {
    this.logger.log(`Getting all challenges for user: ${userId}`);

    const progresses =
      await this.challengeProgressRepository.findAllByUserId(userId);

    return this.mapRowsToDtos(progresses, lang);
  }

  async getAllPaginated(
    query: PaginatedLangQueryDto,
  ): Promise<PaginatedResponseDto<ChallengeProgressResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { rows, total } =
      await this.challengeProgressRepository.findAllPaginated(page, limit);
    const data = await this.mapRowsToDtos(rows, query.lang);
    return toPaginatedResponseDto(data, total, page, limit);
  }

  async update(
    codeOrId: string,
    updateDto: UpdateChallengeProgressDto,
    userId: string,
    lang?: string,
  ): Promise<ChallengeProgressResponseDto> {
    this.logger.log(`Updating challenge ${codeOrId} for user: ${userId}`);

    const challenge = await this.requireChallenge(codeOrId);

    const previous =
      await this.challengeProgressRepository.findByUserIdAndChallengeId(
        userId,
        challenge.id,
      );

    const updated = await this.challengeProgressRepository.upsert(
      userId,
      challenge.id,
      updateDto,
    );

    const wasIdle =
      previous == null || (previous.progress === 0 && !previous.completed);
    const isActive = updated.progress > 0 || updated.completed;
    const metadata = {
      challengeId: challenge.id,
      challengeCode: challenge.code,
      source: EventSource.API,
      body: {
        ...(updateDto.progress !== undefined
          ? { progress: updateDto.progress }
          : {}),
        ...(updateDto.completed !== undefined
          ? { completed: updateDto.completed }
          : {}),
      },
    };

    if (wasIdle && isActive) {
      await this.emitProgressEvent({
        userId,
        eventType: EventType.CHALLENGE_STARTED,
        source: EventSource.CHALLENGE,
        metadata,
        idempotencyKey: `challenge-started:${userId}:${challenge.id}`,
      });
    } else if (
      previous != null &&
      (previous.progress !== updated.progress ||
        previous.completed !== updated.completed)
    ) {
      await this.emitProgressEvent({
        userId,
        eventType: EventType.CHALLENGE_UPDATED,
        source: EventSource.CHALLENGE,
        metadata,
        idempotencyKey: `challenge-updated:${userId}:${challenge.id}:${updated.progress}:${updated.completed}`,
      });
    }

    if (updated.completed && !previous?.completed) {
      await this.emitProgressEvent({
        userId,
        eventType: EventType.CHALLENGE_COMPLETED,
        source: EventSource.CHALLENGE,
        metadata,
        idempotencyKey: `challenge-completed:${userId}:${challenge.id}`,
      });
    }

    return this.mapRowsToDtos([updated], lang).then((rows) => rows[0]);
  }

  /**
   * Best-effort progress event emission. Progress is already persisted by the
   * time this runs — a failure here must not surface as an update failure
   * (the caller would see an error for a write that actually succeeded).
   */
  private async emitProgressEvent(input: RecordUserEventInput): Promise<void> {
    try {
      await this.userEventService.record(input);
    } catch (error) {
      this.logger.error(
        `Failed to record ${input.eventType} for user ${input.userId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async requireChallenge(codeOrId: string) {
    const challenge =
      await this.challengeProgressRepository.findChallengeByCodeOrId(codeOrId);
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }
    return challenge;
  }

  private async mapRowsToDtos(
    rows: ChallengeProgressRow[],
    lang?: string,
  ): Promise<ChallengeProgressResponseDto[]> {
    const titles = await overlayTitles(
      this.translationService,
      'Challenge',
      rows.map((row) => ({
        id: row.challengeId,
        title: row.challenge?.title ?? '',
      })),
      lang,
    );

    return rows.map((row) => ({
      challengeId: row.challengeId,
      userId: row.userId,
      completed: row.completed,
      progress: row.progress,
      challengeTitle: titles[row.challengeId] ?? row.challenge?.title ?? '',
    }));
  }
}
