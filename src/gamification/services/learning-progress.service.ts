import { Injectable, NotFoundException } from '@nestjs/common';
import { ProgressStatus, QuestContentType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import { TranslationService } from '../../translations/services/translation.service';
import {
  CONTENT_ENTITY_TYPE,
  ContentItemDetails,
  ContentItemRef,
  contentItemKey,
  findFinishedItemKeys,
  findItemDetails,
  findItemStatuses,
  UNOBSERVABLE_CONTENT_TYPES,
} from '../content-completion';
import {
  ContentItemProgressDto,
  CurrentQuestDto,
  DimensionProgressDto,
  KnowledgeProgressDto,
  QuestItemStatusDto,
  QuestLevelProgressDto,
} from '../dto/learning-progress.dto';
import {
  KNOWLEDGE_KIND_FLAG,
  KNOWLEDGE_KINDS,
  KnowledgeKind,
} from '../knowledge-progress.config';
import {
  DimensionLevelService,
  UserDimensionLevelView,
} from './dimension-level.service';

type LevelQuest = {
  id: string;
  code: string;
  dimensionId: string;
  name: string | null;
  description: string | null;
  items: ContentItemRef[];
};

type LevelSnapshot = {
  levels: UserDimensionLevelView[];
  quests: LevelQuest[];
  completedQuestIds: Set<string>;
  finished: Set<string>;
  details: Map<string, ContentItemDetails>;
};

/** finished / total * 100, rounded to 2dp like QuestProgressService. */
function percent(finished: number, total: number): number {
  return total > 0 ? Math.round((finished / total) * 10000) / 100 : 0;
}

function isTrackable(item: ContentItemRef): boolean {
  return !UNOBSERVABLE_CONTENT_TYPES.has(item.contentType);
}

/**
 * Read side of per-dimension levels: which quests each level makes available,
 * how far along they are, and the three knowledge bars (which span every
 * quest, not just the current levels). Everything is derived
 * live from content progress, so nothing here can drift out of sync.
 */
@Injectable()
export class LearningProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dimensionLevelService: DimensionLevelService,
    private readonly translationService: TranslationService,
  ) {}

  /** Every dimension with its level and available quests (no item lists). */
  async listDimensions(
    userId: string,
    lang?: string,
  ): Promise<DimensionProgressDto[]> {
    const snapshot = await this.loadSnapshot(userId);
    const locale = this.translationService.resolveLocale(lang);
    await Promise.all([
      this.localizeDimensionNames(snapshot.levels, locale),
      this.localizeQuests(snapshot.quests, locale),
    ]);
    return snapshot.levels.map((level) =>
      this.toDimensionDto(level, snapshot, false),
    );
  }

  /** One dimension, each quest listing its finished and open items. */
  async getDimension(
    userId: string,
    dimensionCode: string,
    lang?: string,
  ): Promise<DimensionProgressDto> {
    const snapshot = await this.loadSnapshot(userId, { dimensionCode });
    const level = snapshot.levels[0];
    if (!level) {
      throw new NotFoundException(`No level for dimension ${dimensionCode}`);
    }
    const locale = this.translationService.resolveLocale(lang);
    await Promise.all([
      this.localizeDimensionNames(snapshot.levels, locale),
      this.localizeQuests(snapshot.quests, locale),
      this.localizeTitles(snapshot.details, locale),
    ]);
    return this.toDimensionDto(level, snapshot, true);
  }

  async listKnowledge(userId: string): Promise<KnowledgeProgressDto[]> {
    const snapshot = await this.loadSnapshot(userId, { allQuests: true });
    return KNOWLEDGE_KINDS.map((kind) =>
      this.toKnowledgeDto(kind, snapshot, false),
    );
  }

  /** One bar, listing its finished and open items with titles in `lang`. */
  async getKnowledge(
    userId: string,
    kind: KnowledgeKind,
    lang?: string,
  ): Promise<KnowledgeProgressDto> {
    const snapshot = await this.loadSnapshot(userId, { allQuests: true });
    await this.localizeTitles(
      snapshot.details,
      this.translationService.resolveLocale(lang),
    );
    return this.toKnowledgeDto(kind, snapshot, true);
  }

  /**
   * The user's current quest with each item's status, or null when none is
   * selected. Quest name, description and item titles are in `lang`.
   */
  async getCurrentQuest(
    userId: string,
    lang?: string,
  ): Promise<CurrentQuestDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentQuest: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            level: true,
            dimension: { select: { code: true } },
            items: {
              select: { contentType: true, contentCode: true, sortOrder: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    const quest = user?.currentQuest;
    if (!quest) return null;

    const refs = quest.items.filter(isTrackable);
    const [statuses, details, questProgress] = await Promise.all([
      findItemStatuses(this.prisma, userId, refs),
      findItemDetails(this.prisma, refs),
      this.prisma.questProgress.findUnique({
        where: { userId_questId: { userId, questId: quest.id } },
        select: { completed: true },
      }),
    ]);
    const locale = this.translationService.resolveLocale(lang);
    await Promise.all([
      this.localizeQuests([quest], locale),
      this.localizeTitles(details, locale),
    ]);

    const items: QuestItemStatusDto[] = refs.map((item) => {
      const key = contentItemKey(item);
      const { status, progress, startedAt } = statuses.get(key)!;
      return {
        contentType: item.contentType,
        contentCode: item.contentCode,
        title: details.get(key)?.title ?? '',
        finished: status === ProgressStatus.COMPLETED,
        status,
        progress,
        startedAt,
        sortOrder: item.sortOrder,
      };
    });
    const finishedItems = items.filter((i) => i.finished).length;
    // Same rule as toQuestDto: once rewarded, a quest stays complete.
    const completed =
      questProgress?.completed === true ||
      (items.length > 0 && finishedItems === items.length);

    return {
      questId: quest.id,
      questCode: quest.code,
      name: quest.name,
      description: quest.description,
      dimensionCode: quest.dimension.code,
      level: quest.level,
      progress: completed ? 100 : percent(finishedItems, items.length),
      completed,
      finishedItems,
      totalItems: items.length,
      items,
    };
  }

  /**
   * Quests at the user's current levels (optionally one dimension), or with
   * `allQuests` every available quest regardless of level.
   */
  private async loadSnapshot(
    userId: string,
    scope: { dimensionCode?: string; allQuests?: boolean } = {},
  ): Promise<LevelSnapshot> {
    const allLevels = scope.allQuests
      ? []
      : await this.dimensionLevelService.listForUser(userId);
    const levels = scope.dimensionCode
      ? allLevels.filter((l) => l.dimensionCode === scope.dimensionCode)
      : allLevels;

    const quests: LevelQuest[] =
      !scope.allQuests && levels.length === 0
        ? []
        : await this.prisma.quest.findMany({
            where: {
              available: true,
              ...(scope.allQuests
                ? {}
                : {
                    OR: levels.map((l) => ({
                      dimensionId: l.dimensionId,
                      level: l.level,
                    })),
                  }),
            },
            select: {
              id: true,
              code: true,
              dimensionId: true,
              name: true,
              description: true,
              items: {
                select: { contentType: true, contentCode: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { code: 'asc' },
          });

    const items = quests.flatMap((q) => q.items).filter(isTrackable);
    const [finished, details, completedRows] = await Promise.all([
      findFinishedItemKeys(this.prisma, userId, items),
      findItemDetails(this.prisma, items),
      this.prisma.questProgress.findMany({
        where: {
          userId,
          completed: true,
          questId: { in: quests.map((q) => q.id) },
        },
        select: { questId: true },
      }),
    ]);

    return {
      levels,
      quests,
      finished,
      details,
      completedQuestIds: new Set(completedRows.map((row) => row.questId)),
    };
  }

  // The localize* helpers translate in place; anything without a translation
  // stays English.

  private async localizeDimensionNames(
    levels: UserDimensionLevelView[],
    locale: string,
  ): Promise<void> {
    if (locale === DEFAULT_LOCALE || levels.length === 0) return;
    const translated = await this.translationService.resolveMany(
      'Dimension',
      levels.map((level) => level.dimensionId),
      locale,
      ['name'],
      {},
    );
    for (const level of levels) {
      level.dimensionName =
        translated[level.dimensionId]?.name ?? level.dimensionName;
    }
  }

  private async localizeQuests(
    quests: Array<{
      id: string;
      name: string | null;
      description: string | null;
    }>,
    locale: string,
  ): Promise<void> {
    if (locale === DEFAULT_LOCALE || quests.length === 0) return;
    const translated = await this.translationService.resolveMany(
      'Quest',
      quests.map((quest) => quest.id),
      locale,
      ['name', 'description'],
      {},
    );
    for (const quest of quests) {
      quest.name = translated[quest.id]?.name ?? quest.name;
      quest.description =
        translated[quest.id]?.description ?? quest.description;
    }
  }

  private async localizeTitles(
    details: Map<string, ContentItemDetails>,
    locale: string,
  ): Promise<void> {
    if (locale === DEFAULT_LOCALE) return;

    const byType = new Map<QuestContentType, ContentItemDetails[]>();
    for (const item of details.values()) {
      if (!item.id) continue;
      byType.set(item.contentType, [
        ...(byType.get(item.contentType) ?? []),
        item,
      ]);
    }

    await Promise.all(
      [...byType].map(async ([contentType, items]) => {
        const translated = await this.translationService.resolveMany(
          CONTENT_ENTITY_TYPE[contentType],
          items.map((item) => item.id!),
          locale,
          ['title'],
          {},
        );
        for (const item of items) {
          item.title = translated[item.id!]?.title ?? item.title;
        }
      }),
    );
  }

  private toDimensionDto(
    level: UserDimensionLevelView,
    snapshot: LevelSnapshot,
    withItems: boolean,
  ): DimensionProgressDto {
    return {
      dimensionCode: level.dimensionCode,
      dimensionName: level.dimensionName,
      level: level.level,
      quests: snapshot.quests
        .filter((q) => q.dimensionId === level.dimensionId)
        .map((q) => this.toQuestDto(q, snapshot, withItems)),
    };
  }

  private toQuestDto(
    quest: LevelQuest,
    snapshot: LevelSnapshot,
    withItems: boolean,
  ): QuestLevelProgressDto {
    const items = quest.items
      .filter(isTrackable)
      .map((item) => this.toItemDto(item, snapshot));
    const finishedItems = items.filter((i) => i.finished).length;
    // Once rewarded, a quest stays complete even if a quiz answer later flips
    // (same rule as QuestProgressService).
    const completed =
      snapshot.completedQuestIds.has(quest.id) ||
      (items.length > 0 && finishedItems === items.length);

    return {
      questId: quest.id,
      questCode: quest.code,
      name: quest.name,
      description: quest.description,
      progress: completed ? 100 : percent(finishedItems, items.length),
      completed,
      finishedItems,
      totalItems: items.length,
      ...(withItems ? { items } : {}),
    };
  }

  private toKnowledgeDto(
    kind: KnowledgeKind,
    snapshot: LevelSnapshot,
    withItems: boolean,
  ): KnowledgeProgressDto {
    const flag = KNOWLEDGE_KIND_FLAG[kind];
    // An item shared by two quests counts once.
    const unique = new Map<string, ContentItemRef>();
    for (const item of snapshot.quests.flatMap((q) => q.items)) {
      if (isTrackable(item)) unique.set(contentItemKey(item), item);
    }
    const items = [...unique.values()]
      .filter((item) => snapshot.details.get(contentItemKey(item))?.[flag])
      .map((item) => this.toItemDto(item, snapshot));
    const finishedItems = items.filter((i) => i.finished).length;

    return {
      kind,
      finishedItems,
      totalItems: items.length,
      percentComplete: percent(finishedItems, items.length),
      ...(withItems ? { items } : {}),
    };
  }

  private toItemDto(
    item: ContentItemRef,
    snapshot: LevelSnapshot,
  ): ContentItemProgressDto {
    const key = contentItemKey(item);
    return {
      contentType: item.contentType,
      contentCode: item.contentCode,
      title: snapshot.details.get(key)?.title ?? '',
      finished: snapshot.finished.has(key),
    };
  }
}
