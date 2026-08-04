import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { pageLimitToSkipTake } from '../../common/utils/pagination';
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';
import { LearningTranslationHelper } from './learning-translation.helper';
import { codeOrIdWhere } from '../utils/code-or-id';
import { toPaginatedResponseDto } from '../utils/paginated';
import {
  buildFoodFactWhere,
  buildMicroLearningWhere,
  buildQuizWhere,
} from '../utils/learning-filters';
import { LearningLangQueryDto } from '../dto/learning-lang-query.dto';
import {
  LearningPaginatedQueryDto,
  LearningQuestListQueryDto,
} from '../dto/learning-list-query.dto';
import { DimensionResponseDto } from '../dto/dimension-response.dto';
import { FoodFactResponseDto } from '../dto/food-fact-response.dto';
import {
  QuizOptionPublicDto,
  QuizResponseDto,
} from '../dto/quiz-response.dto';
import {
  QuizProgressResponseDto,
  UpdateQuizProgressDto,
} from '../dto/quiz-progress.dto';
import { QuestResponseDto } from '../dto/quest-response.dto';
import { MicroLearningResponseDto } from '../dto/micro-learning-response.dto';

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translations: LearningTranslationHelper,
  ) {}

  // ── Dimensions ──────────────────────────────────────────────

  async listDimensions(
    query: LearningLangQueryDto,
  ): Promise<DimensionResponseDto[]> {
    const dimensions = await this.prisma.dimension.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { topics: { orderBy: { sortOrder: 'asc' } } },
    });
    return this.mapDimensions(dimensions, query.lang);
  }

  async getDimension(
    codeOrId: string,
    query: LearningLangQueryDto,
  ): Promise<DimensionResponseDto> {
    const dimension = await this.prisma.dimension.findFirst({
      where: codeOrIdWhere(codeOrId),
      include: { topics: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!dimension) {
      throw new NotFoundException('Dimension not found');
    }
    const [mapped] = await this.mapDimensions([dimension], query.lang);
    return mapped;
  }

  private async mapDimensions(
    dimensions: Array<{
      id: string;
      code: string;
      name: string;
      sortOrder: number;
      topics: Array<{
        id: string;
        code: string;
        name: string;
        dimensionId: string;
        sortOrder: number;
      }>;
    }>,
    lang?: string,
  ): Promise<DimensionResponseDto[]> {
    const locale = this.translations.resolveLocale(lang);
    const dimOverlay = await this.translations.overlayFields(
      'Dimension',
      dimensions,
      locale,
      ['name'],
      (d) => ({ name: d.name }),
    );
    const topics = dimensions.flatMap((d) => d.topics);
    const topicOverlay = await this.translations.overlayFields(
      'Topic',
      topics,
      locale,
      ['name'],
      (t) => ({ name: t.name }),
    );

    return dimensions.map((d) => ({
      id: d.id,
      code: d.code,
      name: dimOverlay[d.id]?.name ?? d.name,
      sortOrder: d.sortOrder,
      topics: d.topics.map((t) => ({
        id: t.id,
        code: t.code,
        name: topicOverlay[t.id]?.name ?? t.name,
        dimensionId: t.dimensionId,
        sortOrder: t.sortOrder,
      })),
    }));
  }

  // ── Food facts ──────────────────────────────────────────────

  async listFoodFacts(
    query: LearningPaginatedQueryDto,
  ): Promise<PaginatedResponseDto<FoodFactResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { skip, take } = pageLimitToSkipTake({ page, limit });
    const where = buildFoodFactWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.foodFact.findMany({
        where,
        skip,
        take,
        orderBy: { code: 'asc' },
      }),
      this.prisma.foodFact.count({ where }),
    ]);

    const data = await this.mapFoodFacts(rows, query.lang);
    return toPaginatedResponseDto(data, total, page, limit);
  }

  async getFoodFact(
    codeOrId: string,
    query: LearningLangQueryDto,
  ): Promise<FoodFactResponseDto> {
    const row = await this.prisma.foodFact.findFirst({
      where: { ...codeOrIdWhere(codeOrId), available: true },
    });
    if (!row) {
      throw new NotFoundException('Food fact not found');
    }
    const [mapped] = await this.mapFoodFacts([row], query.lang);
    return mapped;
  }

  private async mapFoodFacts(
    rows: Array<{
      id: string;
      code: string;
      topicId: string;
      body: string;
      source: string | null;
      level: FoodFactResponseDto['level'];
      health: boolean;
      foodChoice: boolean;
      foodWaste: boolean;
      available: boolean;
    }>,
    lang?: string,
  ): Promise<FoodFactResponseDto[]> {
    const locale = this.translations.resolveLocale(lang);
    const overlay = await this.translations.overlayFields(
      'FoodFact',
      rows,
      locale,
      ['body'],
      (r) => ({ body: r.body }),
    );

    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      topicId: r.topicId,
      body: overlay[r.id]?.body ?? r.body,
      source: r.source,
      level: r.level,
      health: r.health,
      foodChoice: r.foodChoice,
      foodWaste: r.foodWaste,
      available: r.available,
    }));
  }

  // ── Quizzes ─────────────────────────────────────────────────

  async listQuizzes(
    query: LearningPaginatedQueryDto,
  ): Promise<PaginatedResponseDto<QuizResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { skip, take } = pageLimitToSkipTake({ page, limit });
    const where = buildQuizWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where,
        skip,
        take,
        orderBy: { code: 'asc' },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      }),
      this.prisma.quiz.count({ where }),
    ]);

    const data = await this.mapQuizzes(rows, query.lang);
    return toPaginatedResponseDto(data, total, page, limit);
  }

  async getQuiz(
    codeOrId: string,
    query: LearningLangQueryDto,
  ): Promise<QuizResponseDto> {
    const row = await this.prisma.quiz.findFirst({
      where: { ...codeOrIdWhere(codeOrId), available: true },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!row) {
      throw new NotFoundException('Quiz not found');
    }
    const [mapped] = await this.mapQuizzes([row], query.lang);
    return mapped;
  }

  async getQuizProgress(
    userId: string,
    codeOrId: string,
  ): Promise<QuizProgressResponseDto> {
    const quiz = await this.prisma.quiz.findFirst({
      where: codeOrIdWhere(codeOrId),
      select: { id: true },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const progress = await this.prisma.quizProgress.findUnique({
      where: { userId_quizId: { userId, quizId: quiz.id } },
    });
    if (!progress) {
      throw new NotFoundException('Quiz progress not found');
    }
    return this.mapQuizProgress(progress);
  }

  async upsertQuizProgress(
    userId: string,
    codeOrId: string,
    dto: UpdateQuizProgressDto,
  ): Promise<QuizProgressResponseDto> {
    const quiz = await this.prisma.quiz.findFirst({
      where: codeOrIdWhere(codeOrId),
      include: { options: true },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const option = quiz.options.find((o) => o.label === dto.selectedLabel);
    if (!option) {
      throw new BadRequestException(
        `Quiz has no option with label '${dto.selectedLabel}'`,
      );
    }

    const now = new Date();
    const progress = await this.prisma.quizProgress.upsert({
      where: { userId_quizId: { userId, quizId: quiz.id } },
      create: {
        userId,
        quizId: quiz.id,
        selectedOptionId: option.id,
        isCorrect: option.isCorrect,
        completed: true,
        answeredAt: now,
      },
      update: {
        selectedOptionId: option.id,
        isCorrect: option.isCorrect,
        completed: true,
        answeredAt: now,
      },
    });

    return this.mapQuizProgress(progress);
  }

  private mapQuizProgress(progress: {
    id: string;
    userId: string;
    quizId: string;
    selectedOptionId: string | null;
    isCorrect: boolean | null;
    completed: boolean;
    answeredAt: Date | null;
  }): QuizProgressResponseDto {
    return {
      id: progress.id,
      userId: progress.userId,
      quizId: progress.quizId,
      selectedOptionId: progress.selectedOptionId,
      isCorrect: progress.isCorrect,
      completed: progress.completed,
      answeredAt: progress.answeredAt,
    };
  }

  private async mapQuizzes(
    rows: Array<{
      id: string;
      code: string;
      topicId: string;
      question: string;
      explanation: string;
      source: string | null;
      level: QuizResponseDto['level'];
      health: boolean;
      foodChoice: boolean;
      foodWaste: boolean;
      available: boolean;
      options: Array<{
        id: string;
        label: string;
        text: string;
        sortOrder: number;
      }>;
    }>,
    lang?: string,
  ): Promise<QuizResponseDto[]> {
    const locale = this.translations.resolveLocale(lang);
    const quizOverlay = await this.translations.overlayFields(
      'Quiz',
      rows,
      locale,
      ['question', 'explanation'],
      (r) => ({ question: r.question, explanation: r.explanation }),
    );
    const options = rows.flatMap((r) => r.options);
    const optionOverlay = await this.translations.overlayFields(
      'QuizOption',
      options,
      locale,
      ['text'],
      (o) => ({ text: o.text }),
    );

    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      topicId: r.topicId,
      question: quizOverlay[r.id]?.question ?? r.question,
      explanation: quizOverlay[r.id]?.explanation ?? r.explanation,
      source: r.source,
      level: r.level,
      health: r.health,
      foodChoice: r.foodChoice,
      foodWaste: r.foodWaste,
      available: r.available,
      options: r.options.map(
        (o): QuizOptionPublicDto => ({
          id: o.id,
          label: o.label,
          text: optionOverlay[o.id]?.text ?? o.text,
          sortOrder: o.sortOrder,
        }),
      ),
    }));
  }

  // ── Quests ──────────────────────────────────────────────────

  async listQuests(query: LearningQuestListQueryDto): Promise<QuestResponseDto[]> {
    const where: {
      available: boolean;
      level?: LearningQuestListQueryDto['level'];
      dimension?: { code: string };
    } = { available: true };

    if (query.level !== undefined) where.level = query.level;
    if (query.dimensionCode) {
      where.dimension = { code: query.dimensionCode };
    }

    const rows = await this.prisma.quest.findMany({
      where,
      orderBy: [{ dimensionId: 'asc' }, { level: 'asc' }],
    });
    return this.mapQuests(rows, query.lang, false);
  }

  async getQuest(
    codeOrId: string,
    query: LearningLangQueryDto,
  ): Promise<QuestResponseDto> {
    const row = await this.prisma.quest.findFirst({
      where: { ...codeOrIdWhere(codeOrId), available: true },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!row) {
      throw new NotFoundException('Quest not found');
    }
    const [mapped] = await this.mapQuests([row], query.lang, true);
    return mapped;
  }

  private async mapQuests(
    rows: Array<{
      id: string;
      code: string;
      dimensionId: string;
      level: QuestResponseDto['level'];
      title: string | null;
      description: string | null;
      available: boolean;
      items?: Array<{
        id: string;
        contentType: NonNullable<QuestResponseDto['items']>[number]['contentType'];
        contentCode: string;
        sortOrder: number;
      }>;
    }>,
    lang: string | undefined,
    includeItems: boolean,
  ): Promise<QuestResponseDto[]> {
    const locale = this.translations.resolveLocale(lang);
    const overlay = await this.translations.overlayFields(
      'Quest',
      rows,
      locale,
      ['title', 'description'],
      (r) => ({ title: r.title, description: r.description }),
    );

    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      dimensionId: r.dimensionId,
      level: r.level,
      title: overlay[r.id]?.title ?? r.title,
      description: overlay[r.id]?.description ?? r.description,
      available: r.available,
      ...(includeItems
        ? {
            items: (r.items ?? []).map((item) => ({
              id: item.id,
              contentType: item.contentType,
              contentCode: item.contentCode,
              sortOrder: item.sortOrder,
            })),
          }
        : {}),
    }));
  }

  // ── Micro-learnings ─────────────────────────────────────────

  async listMicroLearnings(
    query: LearningPaginatedQueryDto,
  ): Promise<PaginatedResponseDto<MicroLearningResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { skip, take } = pageLimitToSkipTake({ page, limit });
    const where = buildMicroLearningWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.microLearning.findMany({
        where,
        skip,
        take,
        orderBy: { code: 'asc' },
      }),
      this.prisma.microLearning.count({ where }),
    ]);

    const data = await this.mapMicroLearnings(rows, query.lang);
    return toPaginatedResponseDto(data, total, page, limit);
  }

  async getMicroLearning(
    codeOrId: string,
    query: LearningLangQueryDto,
  ): Promise<MicroLearningResponseDto> {
    const row = await this.prisma.microLearning.findFirst({
      where: { ...codeOrIdWhere(codeOrId), available: true },
    });
    if (!row) {
      throw new NotFoundException('Micro-learning not found');
    }
    const [mapped] = await this.mapMicroLearnings([row], query.lang);
    return mapped;
  }

  private async mapMicroLearnings(
    rows: Array<{
      id: string;
      code: string;
      dimensionId: string | null;
      topicId: string | null;
      title: string;
      body: string;
      tips: string | null;
      media: unknown;
      level: MicroLearningResponseDto['level'];
      health: boolean;
      foodChoice: boolean;
      foodWaste: boolean;
      available: boolean;
    }>,
    lang?: string,
  ): Promise<MicroLearningResponseDto[]> {
    const locale = this.translations.resolveLocale(lang);
    const overlay = await this.translations.overlayFields(
      'MicroLearning',
      rows,
      locale,
      ['title', 'body', 'tips'],
      (r) => ({ title: r.title, body: r.body, tips: r.tips }),
    );

    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      dimensionId: r.dimensionId,
      topicId: r.topicId,
      title: overlay[r.id]?.title ?? r.title,
      body: overlay[r.id]?.body ?? r.body,
      tips: overlay[r.id]?.tips ?? r.tips,
      media: r.media,
      level: r.level,
      health: r.health,
      foodChoice: r.foodChoice,
      foodWaste: r.foodWaste,
      available: r.available,
    }));
  }
}
