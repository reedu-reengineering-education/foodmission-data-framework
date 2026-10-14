import { QuestContentType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

/**
 * Whether the item is part of the user's current quest. Unavailable quests
 * don't count, matching the rule engine's scope, which only scores items of
 * an available current quest.
 */
export async function isInCurrentQuest(
  prisma: Pick<PrismaService, 'user'>,
  userId: string,
  contentType: QuestContentType,
  contentCode: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentQuest: {
        select: {
          available: true,
          items: {
            where: { contentType, contentCode },
            select: { id: true },
          },
        },
      },
    },
  });
  const quest = user?.currentQuest;
  return quest != null && quest.available && quest.items.length > 0;
}
