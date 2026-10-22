import { PrismaService } from '../database/prisma.service';
import { findFoodFactReads } from './content-completion';

describe('findFoodFactReads', () => {
  const readAt = new Date('2026-01-01T00:00:00.000Z');
  const findMany = jest.fn();
  const db = { foodFactProgress: { findMany } } as unknown as PrismaService;

  beforeEach(() => findMany.mockReset());

  it('maps each read food fact code to its readAt for the given user', async () => {
    findMany.mockResolvedValue([{ foodFact: { code: 'FF.1' }, readAt }]);

    const reads = await findFoodFactReads(db, 'u1', ['FF.1', 'FF.2']);

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', foodFact: { code: { in: ['FF.1', 'FF.2'] } } },
      select: { readAt: true, foodFact: { select: { code: true } } },
    });
    expect(reads).toEqual(new Map([['FF.1', readAt]]));
  });

  it('returns an empty map when nothing was read', async () => {
    findMany.mockResolvedValue([]);

    await expect(findFoodFactReads(db, 'u1', ['FF.1'])).resolves.toEqual(
      new Map(),
    );
  });
});
