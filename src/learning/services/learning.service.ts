import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuestContentType } from '@prisma/client';
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
import { PaginatedLangQueryDto } from '../dto/paginated-lang-query.dto';
import {
  LearningPaginatedQueryDto,
  LearningQuestListQueryDto,
} from '../dto/learning-list-query.dto';
import { CreateQuestDto } from '../dto/create-quest.dto';
import { DimensionResponseDto } from '../dto/dimension-response.dto';
import { FoodFactResponseDto } from '../dto/food-fact-response.dto';
import { QuizOptionPublicDto, QuizResponseDto } from '../dto/quiz-response.dto';
import {
  QuizProgressResponseDto,
  UpdateQuizProgressDto,
} from '../dto/quiz-progress.dto';
import { QuestResponseDto } from '../dto/quest-response.dto';
import {
  QuestProgressResponseDto,
  UpdateQuestProgressDto,
} from '../dto/quest-progress.dto';
import { MicroLearningResponseDto } from '../dto/micro-learning-response.dto';
import {
  EventSource,
  EventType,
} from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translations: LearningTranslationHelper,
    private readonly userEventService: UserEventService,
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
    lang?: string,
  ): Promise<QuizProgressResponseDto> {
    const quiz = await this.prisma.quiz.findFirst({
      where: codeOrIdWhere(codeOrId),
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const progress = await this.prisma.quizProgress.findUnique({
      where: { userId_quizId: { userId, quizId: quiz.id } },
    });

    return this.mapQuizProgressResponse(userId, quiz, progress, lang);
  }

  async listQuizProgressForUser(
    userId: string,
    lang?: string,
  ): Promise<QuizProgressResponseDto[]> {
    const progresses = await this.prisma.quizProgress.findMany({
      where: { userId },
      include: {
        quiz: { include: { options: { orderBy: { sortOrder: 'asc' } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      progresses.map((progress) =>
        this.mapQuizProgressResponse(userId, progress.quiz, progress, lang),
      ),
    );
  }

  async listAllQuizProgressPaginated(
    query: PaginatedLangQueryDto,
  ): Promise<PaginatedResponseDto<QuizProgressResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { skip, take } = pageLimitToSkipTake({ page, limit });
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.quizProgress.findMany({
        skip,
        take,
        include: {
          quiz: { include: { options: { orderBy: { sortOrder: 'asc' } } } },
        },
        orderBy: [{ userId: 'asc' }, { quizId: 'asc' }],
      }),
      this.prisma.quizProgress.count(),
    ]);
    const data = await Promise.all(
      rows.map((row) =>
        this.mapQuizProgressResponse(row.userId, row.quiz, row, query.lang),
      ),
    );
    return toPaginatedResponseDto(data, total, page, limit);
  }

  async upsertQuizProgress(
    userId: string,
    codeOrId: string,
    dto: UpdateQuizProgressDto,
    lang?: string,
  ): Promise<QuizProgressResponseDto> {
    const quiz = await this.prisma.quiz.findFirst({
      where: codeOrIdWhere(codeOrId),
      include: { options: { orderBy: { sortOrder: 'asc' } } },
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
    const progress = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.quizProgress.findUnique({
        where: { userId_quizId: { userId, quizId: quiz.id } },
      });

      const next = await tx.quizProgress.upsert({
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

      const metadata = {
        quizId: quiz.id,
        quizCode: quiz.code,
        source: EventSource.API,
        isCorrect: option.isCorrect,
        body: { selectedLabel: dto.selectedLabel },
      };

      if (previous == null) {
        await this.userEventService.record(
          {
            userId,
            eventType: EventType.QUIZ_ANSWERED,
            source: EventSource.LEARNING,
            metadata,
            idempotencyKey: `quiz-answered:${userId}:${quiz.id}`,
          },
          tx,
        );
      } else if (previous.selectedOptionId !== next.selectedOptionId) {
        await this.userEventService.record(
          {
            userId,
            eventType: EventType.QUIZ_UPDATED,
            source: EventSource.LEARNING,
            metadata,
            idempotencyKey: `quiz-updated:${userId}:${quiz.id}:${next.selectedOptionId}`,
          },
          tx,
        );
      }

      return next;
    });

    return this.mapQuizProgressResponse(userId, quiz, progress, lang);
  }

  private async mapQuizProgressResponse(
    userId: string,
    quiz: {
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
    },
    progress: {
      id: string;
      userId: string;
      quizId: string;
      selectedOptionId: string | null;
      isCorrect: boolean | null;
      completed: boolean;
      answeredAt: Date | null;
    } | null,
    lang?: string,
  ): Promise<QuizProgressResponseDto> {
    const [mappedQuiz] = await this.mapQuizzes([quiz], lang);
    const base = {
      userId,
      quizId: quiz.id,
      quizCode: quiz.code,
      question: mappedQuiz.question,
      selectedOptionId: progress?.selectedOptionId ?? null,
      isCorrect: progress?.isCorrect ?? null,
      completed: progress?.completed ?? false,
      answeredAt: progress?.answeredAt ?? null,
    };

    if (!progress) {
      return base;
    }

    return { id: progress.id, ...base };
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
      options: r.options.map((o): QuizOptionPublicDto => ({
        id: o.id,
        label: o.label,
        text: optionOverlay[o.id]?.text ?? o.text,
        sortOrder: o.sortOrder,
      })),
    }));
  }

  // ── Quests ──────────────────────────────────────────────────

  async createQuest(dto: CreateQuestDto): Promise<QuestResponseDto> {
    const dimension = await this.prisma.dimension.findUnique({
      where: { id: dto.dimensionId },
      select: { id: true },
    });
    if (!dimension) {
      throw new BadRequestException(`Unknown dimensionId: ${dto.dimensionId}`);
    }

    await this.assertQuestItemCodesExist(dto.items);

    const itemsData = dto.items.map((item, index) => ({
      contentType: item.contentType,
      contentCode: item.contentCode,
      sortOrder: item.sortOrder ?? index,
    }));

    try {
      const row = await this.prisma.quest.create({
        data: {
          code: dto.code,
          dimensionId: dto.dimensionId,
          level: dto.level,
          name: dto.name,
          title: dto.title,
          description: dto.description,
          available: dto.available ?? true,
          items: { create: itemsData },
        },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
      const [mapped] = await this.mapQuests([row], undefined, true);
      return mapped;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A quest with this code already exists');
      }
      throw error;
    }
  }

  async listQuests(
    query: LearningQuestListQueryDto,
  ): Promise<QuestResponseDto[]> {
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
      orderBy: [{ dimensionId: 'asc' }, { level: 'asc' }, { code: 'asc' }],
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

  async getQuestProgress(
    userId: string,
    codeOrId: string,
    lang?: string,
  ): Promise<QuestProgressResponseDto> {
    const quest = await this.prisma.quest.findFirst({
      where: codeOrIdWhere(codeOrId),
    });
    if (!quest) {
      throw new NotFoundException('Quest not found');
    }

    const progress = await this.prisma.questProgress.findUnique({
      where: { userId_questId: { userId, questId: quest.id } },
    });

    return this.mapQuestProgressResponse(userId, quest, progress, lang);
  }

  async listQuestProgressForUser(
    userId: string,
    lang?: string,
  ): Promise<QuestProgressResponseDto[]> {
    const progresses = await this.prisma.questProgress.findMany({
      where: { userId },
      include: { quest: true },
      orderBy: { questId: 'asc' },
    });

    return Promise.all(
      progresses.map((row) =>
        this.mapQuestProgressResponse(userId, row.quest, row, lang),
      ),
    );
  }

  async listAllQuestProgressPaginated(
    query: PaginatedLangQueryDto,
  ): Promise<PaginatedResponseDto<QuestProgressResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { skip, take } = pageLimitToSkipTake({ page, limit });
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.questProgress.findMany({
        skip,
        take,
        include: { quest: true },
        orderBy: [{ userId: 'asc' }, { questId: 'asc' }],
      }),
      this.prisma.questProgress.count(),
    ]);
    const data = await Promise.all(
      rows.map((row) =>
        this.mapQuestProgressResponse(row.userId, row.quest, row, query.lang),
      ),
    );
    return toPaginatedResponseDto(data, total, page, limit);
  }

  async upsertQuestProgress(
    userId: string,
    codeOrId: string,
    dto: UpdateQuestProgressDto,
    lang?: string,
  ): Promise<QuestProgressResponseDto> {
    const quest = await this.prisma.quest.findFirst({
      where: codeOrIdWhere(codeOrId),
    });
    if (!quest) {
      throw new NotFoundException('Quest not found');
    }

    const progress = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.questProgress.findUnique({
        where: { userId_questId: { userId, questId: quest.id } },
      });

      const next = await tx.questProgress.upsert({
        where: { userId_questId: { userId, questId: quest.id } },
        create: {
          userId,
          questId: quest.id,
          completed: dto.completed ?? false,
          progress: dto.progress ?? 0,
          unlockedAt: new Date(),
        },
        update: {
          ...(dto.completed !== undefined ? { completed: dto.completed } : {}),
          ...(dto.progress !== undefined ? { progress: dto.progress } : {}),
        },
      });

      const wasIdle =
        previous == null || (previous.progress === 0 && !previous.completed);
      const isActive = next.progress > 0 || next.completed;
      const metadata = {
        questId: quest.id,
        questCode: quest.code,
        source: EventSource.API,
        body: {
          ...(dto.progress !== undefined ? { progress: dto.progress } : {}),
          ...(dto.completed !== undefined ? { completed: dto.completed } : {}),
        },
      };

      if (wasIdle && isActive) {
        await this.userEventService.record(
          {
            userId,
            eventType: EventType.QUEST_STARTED,
            source: EventSource.QUEST,
            metadata,
            idempotencyKey: `quest-started:${userId}:${quest.id}`,
          },
          tx,
        );
      } else if (
        previous != null &&
        (previous.progress !== next.progress ||
          previous.completed !== next.completed)
      ) {
        await this.userEventService.record(
          {
            userId,
            eventType: EventType.QUEST_UPDATED,
            source: EventSource.QUEST,
            metadata,
            idempotencyKey: `quest-updated:${userId}:${quest.id}:${next.progress}:${next.completed}`,
          },
          tx,
        );
      }

      if (next.completed && !previous?.completed) {
        await this.userEventService.record(
          {
            userId,
            eventType: EventType.QUEST_COMPLETED,
            source: EventSource.QUEST,
            metadata,
            idempotencyKey: `quest-completed:${userId}:${quest.id}`,
          },
          tx,
        );
      }

      return next;
    });

    return this.mapQuestProgressResponse(userId, quest, progress, lang);
  }

  private async mapQuestProgressResponse(
    userId: string,
    quest: {
      id: string;
      code: string;
      name?: string | null;
      title: string | null;
      description: string | null;
    },
    progress: {
      unlockedAt: Date | null;
      completed: boolean;
      progress: number;
    } | null,
    lang?: string,
  ): Promise<QuestProgressResponseDto> {
    const locale = this.translations.resolveLocale(lang);
    const overlay = await this.translations.overlayFields(
      'Quest',
      [quest],
      locale,
      ['name', 'title'],
      (r) => ({ name: r.name, title: r.title }),
    );

    return {
      userId,
      questId: quest.id,
      questCode: quest.code,
      questTitle: overlay[quest.id]?.title ?? quest.title,
      unlockedAt: progress?.unlockedAt ?? null,
      completed: progress?.completed ?? false,
      progress: progress?.progress ?? 0,
    };
  }

  private async assertQuestItemCodesExist(
    items: Array<{ contentType: QuestContentType; contentCode: string }>,
  ): Promise<void> {
    const codesByType = items.reduce((acc, item) => {
      const set = acc.get(item.contentType) ?? new Set<string>();
      set.add(item.contentCode);
      acc.set(item.contentType, set);
      return acc;
    }, new Map<QuestContentType, Set<string>>());

    const missing: string[] = [];

    for (const [contentType, codes] of codesByType) {
      const codeList = [...codes];
      let found: string[] = [];

      switch (contentType) {
        case QuestContentType.MISSION:
          found = (
            await this.prisma.mission.findMany({
              where: { code: { in: codeList } },
              select: { code: true },
            })
          ).map((r) => r.code);
          break;
        case QuestContentType.CHALLENGE:
          found = (
            await this.prisma.challenge.findMany({
              where: { code: { in: codeList } },
              select: { code: true },
            })
          ).map((r) => r.code);
          break;
        case QuestContentType.FOOD_FACT:
          found = (
            await this.prisma.foodFact.findMany({
              where: { code: { in: codeList } },
              select: { code: true },
            })
          ).map((r) => r.code);
          break;
        case QuestContentType.QUIZ:
          found = (
            await this.prisma.quiz.findMany({
              where: { code: { in: codeList } },
              select: { code: true },
            })
          ).map((r) => r.code);
          break;
        case QuestContentType.MICRO_LEARNING:
          found = (
            await this.prisma.microLearning.findMany({
              where: { code: { in: codeList } },
              select: { code: true },
            })
          ).map((r) => r.code);
          break;
      }

      const foundSet = new Set(found);
      for (const code of codeList) {
        if (!foundSet.has(code)) {
          missing.push(`${contentType}:${code}`);
        }
      }
    }

    if (missing.length > 0) {
      throw new BadRequestException(
        `Unknown quest item content codes: ${missing.join(', ')}`,
      );
    }
  }

  private async mapQuests(
    rows: Array<{
      id: string;
      code: string;
      dimensionId: string;
      level: QuestResponseDto['level'];
      name?: string | null;
      title: string | null;
      description: string | null;
      available: boolean;
      items?: Array<{
        id: string;
        contentType: NonNullable<
          QuestResponseDto['items']
        >[number]['contentType'];
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
      ['name', 'title', 'description'],
      (r) => ({ name: r.name, title: r.title, description: r.description }),
    );

    const itemLabels =
      includeItems && rows.some((r) => (r.items?.length ?? 0) > 0)
        ? await this.hydrateQuestItemLabels(
            rows.flatMap((r) => r.items ?? []),
            lang,
          )
        : {};

    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      dimensionId: r.dimensionId,
      level: r.level,
      name: overlay[r.id]?.name ?? r.name,
      title: overlay[r.id]?.title ?? r.title,
      description: overlay[r.id]?.description ?? r.description,
      available: r.available,
      ...(includeItems
        ? {
            items: (r.items ?? []).map((item) => ({
              id: item.id,
              contentType: item.contentType,
              contentCode: item.contentCode,
              label:
                itemLabels[`${item.contentType}:${item.contentCode}`] ??
                item.contentCode,
              sortOrder: item.sortOrder,
            })),
          }
        : {}),
    }));
  }

  private async hydrateQuestItemLabels(
    items: Array<{
      contentType: QuestContentType;
      contentCode: string;
    }>,
    lang?: string,
  ): Promise<Record<string, string>> {
    const labels: Record<string, string> = {};
    const codesByType = items.reduce(
      (acc, item) => {
        const key = item.contentType;
        if (!acc[key]) acc[key] = new Set<string>();
        acc[key].add(item.contentCode);
        return acc;
      },
      {} as Partial<Record<QuestContentType, Set<string>>>,
    );

    const locale = this.translations.resolveLocale(lang);

    const missionCodes = [...(codesByType.MISSION ?? [])];
    if (missionCodes.length > 0) {
      const rows = await this.prisma.mission.findMany({
        where: { code: { in: missionCodes } },
        select: { id: true, code: true, title: true },
      });
      const overlay = await this.translations.overlayFields(
        'Mission',
        rows,
        locale,
        ['title'],
        (r) => ({ title: r.title }),
      );
      for (const row of rows) {
        labels[`${QuestContentType.MISSION}:${row.code}`] =
          overlay[row.id]?.title ?? row.title;
      }
    }

    const challengeCodes = [...(codesByType.CHALLENGE ?? [])];
    if (challengeCodes.length > 0) {
      const rows = await this.prisma.challenge.findMany({
        where: { code: { in: challengeCodes } },
        select: { id: true, code: true, title: true },
      });
      const overlay = await this.translations.overlayFields(
        'Challenge',
        rows,
        locale,
        ['title'],
        (r) => ({ title: r.title }),
      );
      for (const row of rows) {
        labels[`${QuestContentType.CHALLENGE}:${row.code}`] =
          overlay[row.id]?.title ?? row.title;
      }
    }

    const factCodes = [...(codesByType.FOOD_FACT ?? [])];
    if (factCodes.length > 0) {
      const rows = await this.prisma.foodFact.findMany({
        where: { code: { in: factCodes } },
        select: { id: true, code: true, body: true },
      });
      const overlay = await this.translations.overlayFields(
        'FoodFact',
        rows,
        locale,
        ['body'],
        (r) => ({ body: r.body }),
      );
      for (const row of rows) {
        const body = overlay[row.id]?.body ?? row.body;
        labels[`${QuestContentType.FOOD_FACT}:${row.code}`] =
          body.length > 80 ? `${body.slice(0, 77)}...` : body;
      }
    }

    const quizCodes = [...(codesByType.QUIZ ?? [])];
    if (quizCodes.length > 0) {
      const rows = await this.prisma.quiz.findMany({
        where: { code: { in: quizCodes } },
        select: { id: true, code: true, question: true },
      });
      const overlay = await this.translations.overlayFields(
        'Quiz',
        rows,
        locale,
        ['question'],
        (r) => ({ question: r.question }),
      );
      for (const row of rows) {
        labels[`${QuestContentType.QUIZ}:${row.code}`] =
          overlay[row.id]?.question ?? row.question;
      }
    }

    const microCodes = [...(codesByType.MICRO_LEARNING ?? [])];
    if (microCodes.length > 0) {
      const rows = await this.prisma.microLearning.findMany({
        where: { code: { in: microCodes } },
        select: { id: true, code: true, title: true },
      });
      const overlay = await this.translations.overlayFields(
        'MicroLearning',
        rows,
        locale,
        ['title'],
        (r) => ({ title: r.title }),
      );
      for (const row of rows) {
        labels[`${QuestContentType.MICRO_LEARNING}:${row.code}`] =
          overlay[row.id]?.title ?? row.title;
      }
    }

    return labels;
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
