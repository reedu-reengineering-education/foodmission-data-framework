import { Prisma, ProgressStatus, QuestContentType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type Db = PrismaService | Prisma.TransactionClient;

export type ContentItemRef = {
  contentType: QuestContentType;
  contentCode: string;
};

/** `contentType:contentCode`, the key every finished-set below uses. */
export function contentItemKey(item: ContentItemRef): string {
  return `${item.contentType}:${item.contentCode}`;
}

/**
 * Item types with no way to observe completion. Callers leave them out of any
 * denominator rather than counting them as unfinished forever.
 */
export const UNOBSERVABLE_CONTENT_TYPES: ReadonlySet<QuestContentType> =
  new Set<QuestContentType>([QuestContentType.MICRO_LEARNING]);

function groupCodesByType(
  items: ContentItemRef[],
): Map<QuestContentType, string[]> {
  const codesByType = new Map<QuestContentType, string[]>();
  for (const item of items) {
    const codes = codesByType.get(item.contentType) ?? [];
    codes.push(item.contentCode);
    codesByType.set(item.contentType, codes);
  }
  return codesByType;
}

/**
 * One query per content type present, filtering through the relation so no
 * separate code-to-id lookup is needed. Returns `contentType:contentCode`
 * keys for the items the user has finished.
 */
export async function findFinishedItemKeys(
  db: Db,
  userId: string,
  items: ContentItemRef[],
): Promise<Set<string>> {
  const finished = new Set<string>();

  await Promise.all(
    [...groupCodesByType(items)].map(async ([contentType, codes]) => {
      for (const code of await findFinishedCodes(
        db,
        userId,
        contentType,
        codes,
      )) {
        finished.add(contentItemKey({ contentType, contentCode: code }));
      }
    }),
  );

  return finished;
}

async function findFinishedCodes(
  db: Db,
  userId: string,
  contentType: QuestContentType,
  codes: string[],
): Promise<string[]> {
  switch (contentType) {
    case QuestContentType.MISSION: {
      const rows = await db.missionProgress.findMany({
        where: { userId, completed: true, mission: { code: { in: codes } } },
        select: { mission: { select: { code: true } } },
      });
      return rows.map((row) => row.mission.code);
    }
    case QuestContentType.CHALLENGE: {
      const rows = await db.challengeProgress.findMany({
        where: {
          userId,
          completed: true,
          challenge: { code: { in: codes } },
        },
        select: { challenge: { select: { code: true } } },
      });
      return rows.map((row) => row.challenge.code);
    }
    case QuestContentType.QUIZ: {
      // `completed` is set true for wrong answers too, so it cannot be the
      // predicate — a quiz item counts only once actually passed.
      const rows = await db.quizProgress.findMany({
        where: { userId, isCorrect: true, quiz: { code: { in: codes } } },
        select: { quiz: { select: { code: true } } },
      });
      return rows.map((row) => row.quiz.code);
    }
    case QuestContentType.FOOD_FACT: {
      // FoodFactProgress has no `completed` column — the row is the read.
      const rows = await db.foodFactProgress.findMany({
        where: { userId, foodFact: { code: { in: codes } } },
        select: { foodFact: { select: { code: true } } },
      });
      return rows.map((row) => row.foodFact.code);
    }
    default:
      return [];
  }
}

export type ContentItemStatus = {
  status: ProgressStatus;
  /** 0–100 */
  progress: number;
};

const NOT_STARTED: ContentItemStatus = {
  status: ProgressStatus.NOT_STARTED,
  progress: 0,
};

const COMPLETED: ContentItemStatus = {
  status: ProgressStatus.COMPLETED,
  progress: 100,
};

/**
 * Status and progress of each item, keyed like findFinishedItemKeys. COMPLETED
 * matches "finished" there; missions and challenges also report partial
 * progress and a wrongly answered quiz is FAILED. Items without a progress
 * row are NOT_STARTED.
 */
export async function findItemStatuses(
  db: Db,
  userId: string,
  items: ContentItemRef[],
): Promise<Map<string, ContentItemStatus>> {
  const statuses = new Map<string, ContentItemStatus>();

  await Promise.all(
    [...groupCodesByType(items)].map(async ([contentType, codes]) => {
      let rows: Array<{ code: string } & ContentItemStatus> = [];
      switch (contentType) {
        case QuestContentType.MISSION:
          rows = (
            await db.missionProgress.findMany({
              where: { userId, mission: { code: { in: codes } } },
              select: {
                completed: true,
                status: true,
                progress: true,
                mission: { select: { code: true } },
              },
            })
          ).map((row) => ({
            code: row.mission.code,
            ...(row.completed
              ? COMPLETED
              : { status: row.status, progress: row.progress }),
          }));
          break;
        case QuestContentType.CHALLENGE:
          rows = (
            await db.challengeProgress.findMany({
              where: { userId, challenge: { code: { in: codes } } },
              select: {
                completed: true,
                status: true,
                progress: true,
                challenge: { select: { code: true } },
              },
            })
          ).map((row) => ({
            code: row.challenge.code,
            ...(row.completed
              ? COMPLETED
              : { status: row.status, progress: row.progress }),
          }));
          break;
        case QuestContentType.QUIZ:
          rows = (
            await db.quizProgress.findMany({
              where: { userId, quiz: { code: { in: codes } } },
              select: { isCorrect: true, quiz: { select: { code: true } } },
            })
          ).map((row) => ({
            code: row.quiz.code,
            ...(row.isCorrect === true
              ? COMPLETED
              : row.isCorrect === false
                ? { status: ProgressStatus.FAILED, progress: 0 }
                : NOT_STARTED),
          }));
          break;
        case QuestContentType.FOOD_FACT:
          rows = (
            await db.foodFactProgress.findMany({
              where: { userId, foodFact: { code: { in: codes } } },
              select: { foodFact: { select: { code: true } } },
            })
          ).map((row) => ({ code: row.foodFact.code, ...COMPLETED }));
          break;
      }
      for (const { code, ...rest } of rows) {
        statuses.set(contentItemKey({ contentType, contentCode: code }), rest);
      }
    }),
  );

  for (const item of items) {
    const key = contentItemKey(item);
    if (!statuses.has(key)) statuses.set(key, NOT_STARTED);
  }
  return statuses;
}

export type KnowledgeFlags = {
  health: boolean;
  foodChoice: boolean;
  foodWaste: boolean;
};

export type ContentItemDetails = KnowledgeFlags & { title: string };

const NO_DETAILS: ContentItemDetails = {
  title: '',
  health: false,
  foodChoice: false,
  foodWaste: false,
};

/**
 * Title and knowledge tags (health / food choice / food waste) for each item,
 * keyed like findFinishedItemKeys. One query per content type present.
 */
export async function findItemDetails(
  db: Db,
  items: ContentItemRef[],
): Promise<Map<string, ContentItemDetails>> {
  const details = new Map<string, ContentItemDetails>();
  const flags = { health: true, foodChoice: true, foodWaste: true } as const;

  await Promise.all(
    [...groupCodesByType(items)].map(async ([contentType, codes]) => {
      const where = { code: { in: codes } };
      let rows: Array<{ code: string } & ContentItemDetails> = [];
      switch (contentType) {
        case QuestContentType.MISSION:
          rows = await db.mission.findMany({
            where,
            select: { code: true, title: true, ...flags },
          });
          break;
        case QuestContentType.CHALLENGE:
          rows = await db.challenge.findMany({
            where,
            select: { code: true, title: true, ...flags },
          });
          break;
        case QuestContentType.QUIZ:
          rows = (
            await db.quiz.findMany({
              where,
              select: { code: true, question: true, ...flags },
            })
          ).map(({ question, ...rest }) => ({ ...rest, title: question }));
          break;
        case QuestContentType.FOOD_FACT:
          rows = (
            await db.foodFact.findMany({
              where,
              select: { code: true, body: true, ...flags },
            })
          ).map(({ body, ...rest }) => ({ ...rest, title: body }));
          break;
        case QuestContentType.MICRO_LEARNING:
          rows = await db.microLearning.findMany({
            where,
            select: { code: true, title: true, ...flags },
          });
          break;
      }
      for (const { code, ...rest } of rows) {
        details.set(contentItemKey({ contentType, contentCode: code }), rest);
      }
    }),
  );

  for (const item of items) {
    const key = contentItemKey(item);
    if (!details.has(key)) details.set(key, NO_DETAILS);
  }
  return details;
}
