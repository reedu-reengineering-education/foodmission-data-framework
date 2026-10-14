import {
  EffMatchType,
  EffStage,
  FootprintBasis,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { gunzipSync } from 'zlib';
import { parseCsvRecords } from '../import-nevo-translations';

/** Both CSVs are built by `npm run db:build:eff` (scripts/seeds/build-nevo-eff.ts)
 * from the EFSA EFF database (Zenodo 17899564, CC BY 4.0). The footprints CSV
 * is gzipped (~22 MB raw): one row per product x country x basis x stage. */
export const DEFAULT_EFF_FOOTPRINTS_CSV = path.join(
  process.cwd(),
  'prisma',
  'seeds',
  'data',
  'eff',
  'eff_footprints.csv.gz',
);

export const DEFAULT_NEVO_EFF_MAPPING_CSV = path.join(
  process.cwd(),
  'prisma',
  'seeds',
  'data',
  'nevo',
  'nevo_eff_mapping.csv',
);

export const EFF_INDICATORS = [
  'acidification',
  'climateChange',
  'particulateMatter',
  'eutrophicationMarine',
  'eutrophicationFreshwater',
  'eutrophicationTerrestrial',
  'humanToxicityCancer',
  'humanToxicityNonCancer',
  'ionisingRadiation',
  'landUse',
  'ozoneDepletion',
  'photochemicalOzoneFormation',
  'resourceUseFossils',
  'resourceUseMineralsMetals',
  'waterUse',
  'ecotoxicityFreshwater',
] as const;

export type EffIndicator = (typeof EFF_INDICATORS)[number];

/** "TOTAL" is the published total; the other stages are its breakdown. */
export type EffFootprintStageName = EffStage | 'TOTAL';

export type EffFootprintRow = {
  foodex2Code: string;
  product: string;
  category: string | null;
  country: string;
  basis: FootprintBasis;
  stage: EffFootprintStageName;
} & Record<EffIndicator, number>;

export type NevoEffMappingRow = {
  nevoCode: number;
  foodex2Code: string;
  matchType: EffMatchType;
  preferredBasis: FootprintBasis;
};

function isBasis(value: string): value is FootprintBasis {
  return (Object.values(FootprintBasis) as string[]).includes(value);
}

function isMatchType(value: string): value is EffMatchType {
  return (Object.values(EffMatchType) as string[]).includes(value);
}

function isStage(value: string): value is EffFootprintStageName {
  return (
    value === 'TOTAL' || (Object.values(EffStage) as string[]).includes(value)
  );
}

function readCsv(file: string): string {
  const raw = fs.readFileSync(file);
  return (file.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf-8');
}

function indicatorValues(row: EffFootprintRow): Record<EffIndicator, number> {
  return Object.fromEntries(EFF_INDICATORS.map((i) => [i, row[i]])) as Record<
    EffIndicator,
    number
  >;
}

/** Drops rows with an unknown basis/stage or a missing indicator value —
 * every indicator column is NOT NULL. */
export function parseEffFootprintsCsv(content: string): EffFootprintRow[] {
  const rows: EffFootprintRow[] = [];
  for (const record of parseCsvRecords(content)) {
    const basis = record.basis ?? '';
    const stage = record.stage ?? '';
    if (
      !record.foodex2_code ||
      !record.country ||
      !isBasis(basis) ||
      !isStage(stage)
    ) {
      continue;
    }

    const values = {} as Record<EffIndicator, number>;
    const complete = EFF_INDICATORS.every((indicator) => {
      values[indicator] = Number.parseFloat(record[indicator] ?? '');
      return !Number.isNaN(values[indicator]);
    });
    if (!complete) continue;

    rows.push({
      foodex2Code: record.foodex2_code,
      product: record.product,
      category: record.category || null,
      country: record.country,
      basis,
      stage,
      ...values,
    });
  }
  return rows;
}

export function parseNevoEffMappingCsv(content: string): NevoEffMappingRow[] {
  const rows: NevoEffMappingRow[] = [];
  for (const record of parseCsvRecords(content)) {
    const nevoCode = Number.parseInt(record['NEVO-code'] ?? '', 10);
    const matchType = record.match_type ?? '';
    const preferredBasis = record.preferred_basis ?? '';
    if (
      Number.isNaN(nevoCode) ||
      !record.eff_foodex2_code ||
      !isMatchType(matchType) ||
      !isBasis(preferredBasis)
    ) {
      continue;
    }
    rows.push({
      nevoCode,
      foodex2Code: record.eff_foodex2_code,
      matchType,
      preferredBasis,
    });
  }
  return rows;
}

export type SeedNevoEnvironmentOptions = {
  footprintsFile?: string;
  mappingFile?: string;
};

export type SeedNevoEnvironmentReport = {
  products: number;
  footprints: number;
  footprintStages: number;
  linkedFoods: number;
  clearedFoods: number;
  skippedUnknownNevoCode: number;
  skippedUnknownProduct: number;
};

const EMPTY_REPORT: SeedNevoEnvironmentReport = {
  products: 0,
  footprints: 0,
  footprintStages: 0,
  linkedFoods: 0,
  clearedFoods: 0,
  skippedUnknownNevoCode: 0,
  skippedUnknownProduct: 0,
};

/**
 * Upserts EffProduct rows and replaces all EffFootprint (+ stage) rows in
 * one transaction, so readers never see a half-loaded table.
 *
 * Production DB and API run in different data centres, so every statement is
 * a network round trip: products go in as one set-based upsert and footprints
 * via createMany (bulk INSERTs), never row by row.
 */
async function seedEffFootprints(
  prisma: PrismaClient,
  rows: EffFootprintRow[],
): Promise<{
  idByCode: Map<string, string>;
  footprints: number;
  footprintStages: number;
}> {
  const products = new Map<string, EffFootprintRow>();
  for (const row of rows) products.set(row.foodex2Code, row);

  const productRows = [...products.values()];
  // Existing products keep their id on conflict; RETURNING gives the ids of both.
  const saved = await prisma.$queryRaw<{ id: string; foodex2Code: string }[]>`
    INSERT INTO "eff_products" ("id", "foodex2Code", "name", "category", "updatedAt")
    SELECT p.id, p.code, p.name, p.category, now()
    FROM unnest(
      ${productRows.map(() => randomUUID())}::text[],
      ${productRows.map((p) => p.foodex2Code)}::text[],
      ${productRows.map((p) => p.product)}::text[],
      ${productRows.map((p) => p.category)}::text[]
    ) AS p(id, code, name, category)
    ON CONFLICT ("foodex2Code") DO UPDATE
      SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "updatedAt" = now()
    RETURNING "id", "foodex2Code"`;
  const idByCode = new Map(saved.map((p) => [p.foodex2Code, p.id]));

  // Ids are generated here so stage rows can reference their footprint
  // without reading the footprints back.
  const footprintKey = (row: EffFootprintRow) =>
    `${row.foodex2Code}|${row.country}|${row.basis}`;
  const footprintIdByKey = new Map<string, string>();
  const footprints: Prisma.EffFootprintCreateManyInput[] = [];
  for (const row of rows.filter((r) => r.stage === 'TOTAL')) {
    const id = randomUUID();
    footprintIdByKey.set(footprintKey(row), id);
    footprints.push({
      id,
      effProductId: idByCode.get(row.foodex2Code)!,
      country: row.country,
      basis: row.basis,
      ...indicatorValues(row),
    });
  }

  const stages: Prisma.EffFootprintStageCreateManyInput[] = [];
  for (const row of rows) {
    const footprintId = footprintIdByKey.get(footprintKey(row));
    if (row.stage === 'TOTAL' || !footprintId) continue;
    stages.push({ footprintId, stage: row.stage, ...indicatorValues(row) });
  }

  const CREATE_BATCH = 5000;
  await prisma.$transaction(
    async (tx) => {
      // cascades to eff_footprint_stages
      await tx.effFootprint.deleteMany({});
      for (let i = 0; i < footprints.length; i += CREATE_BATCH) {
        await tx.effFootprint.createMany({
          data: footprints.slice(i, i + CREATE_BATCH),
        });
      }
      for (let i = 0; i < stages.length; i += CREATE_BATCH) {
        await tx.effFootprintStage.createMany({
          data: stages.slice(i, i + CREATE_BATCH),
        });
      }
    },
    { timeout: 300_000 },
  );

  return {
    idByCode,
    footprints: footprints.length,
    footprintStages: stages.length,
  };
}

/**
 * Loads the EFF database (products, per-country footprints and their
 * life-cycle stage breakdown) and links NEVO generic foods to their EFF
 * product. Idempotent: footprints are replaced and foods that dropped out of
 * the mapping get their link cleared.
 */
export async function seedNevoEnvironment(
  prisma: PrismaClient,
  options: SeedNevoEnvironmentOptions = {},
): Promise<SeedNevoEnvironmentReport> {
  const footprintsFile = options.footprintsFile ?? DEFAULT_EFF_FOOTPRINTS_CSV;
  const mappingFile = options.mappingFile ?? DEFAULT_NEVO_EFF_MAPPING_CSV;
  console.log('🌱 Seeding EFF environmental footprints and NEVO links...');

  for (const file of [footprintsFile, mappingFile]) {
    if (!fs.existsSync(file)) {
      console.warn(`⚠️  EFF CSV not found at ${file}, skipping.`);
      return EMPTY_REPORT;
    }
  }

  const { idByCode, footprints, footprintStages } = await seedEffFootprints(
    prisma,
    parseEffFootprintsCsv(readCsv(footprintsFile)),
  );

  const foods = await prisma.genericFood.findMany({
    select: { id: true, nevoCode: true },
  });
  const foodIdByNevoCode = new Map(foods.map((f) => [f.nevoCode, f.id]));

  let skippedUnknownNevoCode = 0;
  let skippedUnknownProduct = 0;
  const links: {
    id: string;
    effProductId: string;
    matchType: EffMatchType;
    preferredBasis: FootprintBasis;
  }[] = [];
  const mappingRows = parseNevoEffMappingCsv(readCsv(mappingFile));
  for (const row of mappingRows) {
    const id = foodIdByNevoCode.get(row.nevoCode);
    const effProductId = idByCode.get(row.foodex2Code);
    if (!id) {
      skippedUnknownNevoCode += 1;
      continue;
    }
    if (!effProductId) {
      skippedUnknownProduct += 1;
      continue;
    }
    links.push({
      id,
      effProductId,
      matchType: row.matchType,
      preferredBasis: row.preferredBasis,
    });
  }

  // Two statements instead of one UPDATE per food (see seedEffFootprints).
  const [{ count: clearedFoods }] = await prisma.$transaction([
    prisma.genericFood.updateMany({
      where: {
        effProductId: { not: null },
        id: { notIn: links.map((l) => l.id) },
      },
      data: { effProductId: null, effMatchType: null, effPreferredBasis: null },
    }),
    prisma.$executeRaw`
      UPDATE "generic_foods" AS g
      SET "effProductId" = l.product_id,
          "effMatchType" = l.match_type::"EffMatchType",
          "effPreferredBasis" = l.preferred_basis::"FootprintBasis",
          "updatedAt" = now()
      FROM unnest(
        ${links.map((l) => l.id)}::text[],
        ${links.map((l) => l.effProductId)}::text[],
        ${links.map((l) => l.matchType)}::text[],
        ${links.map((l) => l.preferredBasis)}::text[]
      ) AS l(id, product_id, match_type, preferred_basis)
      WHERE g."id" = l.id`,
  ]);

  console.log(
    `   ✅ ${idByCode.size} EFF products, ${footprints} footprints (${footprintStages} stage rows), ${links.length} generic foods linked (${clearedFoods} cleared)`,
  );
  return {
    products: idByCode.size,
    footprints,
    footprintStages,
    linkedFoods: links.length,
    clearedFoods,
    skippedUnknownNevoCode,
    skippedUnknownProduct,
  };
}
