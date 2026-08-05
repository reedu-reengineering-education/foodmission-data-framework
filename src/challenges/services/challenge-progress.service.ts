import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';
import { PaginatedLangQueryDto } from '../../learning/dto/paginated-lang-query.dto';
import { overlayTitles } from '../../learning/utils/overlay-titles';
import { toPaginatedResponseDto } from '../../learning/utils/paginated';
import { TranslationService } from '../../translations/services/translation.service';
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
  ) {}

  async getChallengeById(
    challengeId: string,
    userId: string,
    lang?: string,
  ): Promise<ChallengeProgressResponseDto> {
    this.logger.log(`Getting challenge ${challengeId} for user: ${userId}`);

    const challenge =
      await this.challengeProgressRepository.findChallengeById(challengeId);
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const progress =
      await this.challengeProgressRepository.findByUserIdAndChallengeId(
        userId,
        challengeId,
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
    challengeId: string,
    updateDto: UpdateChallengeProgressDto,
    userId: string,
    lang?: string,
  ): Promise<ChallengeProgressResponseDto> {
    this.logger.log(`Updating challenge ${challengeId} for user: ${userId}`);

    const challenge =
      await this.challengeProgressRepository.findChallengeById(challengeId);
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const updated = await this.challengeProgressRepository.upsert(
      userId,
      challengeId,
      updateDto,
    );

    return this.mapRowsToDtos([updated], lang).then((rows) => rows[0]);
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
