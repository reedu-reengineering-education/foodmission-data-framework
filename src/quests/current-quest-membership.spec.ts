import { PrismaService } from '../database/prisma.service';
import { isInCurrentQuest } from './current-quest-membership';

describe('isInCurrentQuest', () => {
  function prismaWith(currentQuest: unknown) {
    return {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            currentQuest === undefined ? null : { currentQuest },
          ),
      },
    } as unknown as Pick<PrismaService, 'user'> & {
      user: { findUnique: jest.Mock };
    };
  }

  it('is true for an item of the available current quest', async () => {
    const prisma = prismaWith({ available: true, items: [{ id: 'qi1' }] });

    await expect(
      isInCurrentQuest(prisma, 'u1', 'MISSION', 'M.A1.1'),
    ).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        select: {
          currentQuest: {
            select: {
              available: true,
              items: {
                where: { contentType: 'MISSION', contentCode: 'M.A1.1' },
                select: { id: true },
              },
            },
          },
        },
      }),
    );
  });

  it.each([
    ['the item is not in the quest', { available: true, items: [] }],
    ['the quest is unavailable', { available: false, items: [{ id: 'qi1' }] }],
    ['no quest is selected', null],
    ['the user does not exist', undefined],
  ])('is false when %s', async (_label, currentQuest) => {
    await expect(
      isInCurrentQuest(prismaWith(currentQuest), 'u1', 'CHALLENGE', 'CH.A1.1'),
    ).resolves.toBe(false);
  });
});
