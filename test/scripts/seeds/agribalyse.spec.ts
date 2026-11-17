import { PrismaClient } from '@prisma/client';
import { seedAgribalyse } from '../../../scripts/seeds/prod/agribalyse';

describe('seedAgribalyse', () => {
  const imported: Record<string, unknown>[] = [];
  const prisma = {
    agribalyseFood: {
      upsert: ({ create }: { create: Record<string, unknown> }) => {
        imported.push(create);
        return Promise.resolve();
      },
    },
  } as unknown as PrismaClient;
  const rows = () => imported;

  beforeAll(async () => {
    const log = console.log;
    console.log = () => undefined;
    await seedAgribalyse(prisma);
    console.log = log;
  });

  it('imports every AGRIBALYSE food once', () => {
    const codes = rows().map((row) => row.code);
    expect(codes).toHaveLength(2451);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('reads names, indicators and quality per food', () => {
    expect(rows().find((row) => row.code === '20034')).toEqual({
      code: '20034',
      ciqualCode: 20034,
      foodGroup: 'fruits, légumes, légumineuses et oléagineux',
      foodSubgroup: 'légumes',
      nameFr: 'Oignon, cru',
      nameEn: 'Onion, raw',
      preparation: 'Pas de préparation',
      dqr: 2.39,
      efScorePerKg: 0.0487,
      co2PerKg: 0.421,
      version: '3.2',
    });
  });

  it('gives every food finite, non-negative values', () => {
    expect(
      rows().filter(
        (row) =>
          ![row.ciqualCode, row.dqr, row.efScorePerKg, row.co2PerKg].every(
            (value) => Number.isFinite(value) && (value as number) >= 0,
          ),
      ),
    ).toEqual([]);
  });
});
