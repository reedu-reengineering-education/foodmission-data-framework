import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parseCsvRecords } from '../import-nevo-translations';

export const DEFAULT_DIET_FLAGS_CSV = path.join(
  process.cwd(),
  'prisma',
  'seeds',
  'data',
  'nevo',
  'nevo_diet_flags.csv',
);

function parseYesNo(raw: string | undefined): boolean {
  return (raw ?? '').trim().toLowerCase() === 'yes';
}

export type DietFlagsRow = {
  nevoCode: number;
  vegan: boolean;
  vegetarian: boolean;
  meatOrFish: boolean;
  legume: boolean;
};

/** `nevo_diet_flags.csv` is just NEVO-code + the four flag columns — no
 * nutrition data duplicated, mirrors `nevo_translations.csv`'s shape. */
export function parseDietFlagsCsv(content: string): DietFlagsRow[] {
  return parseCsvRecords(content)
    .map((record) => {
      const nevoCode = Number.parseInt(record['NEVO-code'] ?? '', 10);
      return {
        nevoCode,
        vegan: parseYesNo(record.vegan),
        vegetarian: parseYesNo(record.vegetarian),
        meatOrFish: parseYesNo(record.meat_or_fish),
        legume: parseYesNo(record.legume),
      };
    })
    .filter((row) => !Number.isNaN(row.nevoCode));
}

export type SeedDietFlagsOptions = {
  file?: string;
};

export type SeedDietFlagsReport = {
  foodsInCsv: number;
  updated: number;
  skippedUnknownNevoCode: number;
  unknownNevoCodes: number[];
};

/**
 * Patches vegan/vegetarian/meatOrFish/legume onto existing GenericFood rows.
 * Cheap boolean overwrite (~2.3k rows) — idempotent, safe to rerun every seed
 * unlike the bulk nutrition/translations imports, so there's no skip-existing
 * flag here.
 */
export async function seedDietFlags(
  prisma: PrismaClient,
  options: SeedDietFlagsOptions = {},
): Promise<SeedDietFlagsReport> {
  const file = options.file ?? DEFAULT_DIET_FLAGS_CSV;
  console.log('🌱 Patching diet flags (vegan/vegetarian/meatOrFish/legume)...');

  if (!fs.existsSync(file)) {
    console.warn(`⚠️  Diet-flags CSV not found at ${file}, skipping.`);
    return { foodsInCsv: 0, updated: 0, skippedUnknownNevoCode: 0, unknownNevoCodes: [] };
  }

  const rows = parseDietFlagsCsv(fs.readFileSync(file, 'utf-8'));

  const foods = await prisma.genericFood.findMany({
    select: { id: true, nevoCode: true },
  });
  const idByNevoCode = new Map(foods.map((f) => [f.nevoCode, f.id]));

  let skippedUnknownNevoCode = 0;
  const unknownNevoCodes: number[] = [];
  const updates: { id: string; row: DietFlagsRow }[] = [];

  for (const row of rows) {
    const id = idByNevoCode.get(row.nevoCode);
    if (!id) {
      skippedUnknownNevoCode += 1;
      unknownNevoCodes.push(row.nevoCode);
      continue;
    }
    updates.push({ id, row });
  }

  const BATCH_SIZE = 500;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map(({ id, row }) =>
        prisma.genericFood.update({
          where: { id },
          data: {
            vegan: row.vegan,
            vegetarian: row.vegetarian,
            meatOrFish: row.meatOrFish,
            legume: row.legume,
          },
        }),
      ),
    );
  }

  console.log(`   ✅ Patched diet flags on ${updates.length} generic foods`);
  return {
    foodsInCsv: rows.length,
    updated: updates.length,
    skippedUnknownNevoCode,
    unknownNevoCodes,
  };
}
