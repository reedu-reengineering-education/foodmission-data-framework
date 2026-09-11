import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  FOODEX2_CANONICAL_CONFIG,
  FOODEX2_DETAIL_LEVEL,
} from '../../../src/generic-foods/foodex2/foodex2-canonical.config';
import {
  Foodex2HierarchyNode,
  NevoCandidate,
  parseFoodex2BaseCode,
  resolveConceptCode,
  selectCanonicalNevo,
} from '../../../src/generic-foods/foodex2/foodex2-resolution';

/**
 * Imports the FoodEx2 (MTX) vocabulary and links it to the existing NEVO data.
 *
 * The CSV is produced by `npm run foodex2:extract` from EFSA's published
 * catalogue; see `scripts/foodex2/extract-mtx.ts`. Both stages are idempotent:
 * terms are upserted by `code`, and mappings are rebuilt from scratch on every
 * run, so re-seeding never duplicates rows.
 */

const DATA_DIR = path.join(process.cwd(), 'prisma', 'seeds', 'data', 'foodex2');
const CSV_PATTERN = /^foodex2-mtx-(.+)\.csv$/;

/** Rows are written in chunks to keep statement sizes reasonable. */
const CHUNK_SIZE = 4000;

interface Foodex2CsvRow {
  code: string;
  name: string;
  shortName: string;
  detailLevel: string;
  termType: string;
  parentCode: string;
  order: string;
  reportable: string;
}

export interface Foodex2ImportReport {
  mtxVersion: string | null;
  termsImported: number;
  coreTerms: number;
  duplicateCodes: string[];
  nevoTotal: number;
  nevoWithoutFoodex2Code: number[];
  unknownFoodex2Codes: string[];
  unresolvedFoodex2Codes: string[];
  mappedConcepts: number;
  fallbackConcepts: number;
  mappedNevoItems: number;
  tiedCanonicalConcepts: string[];
  coreTermsWithoutNevo: number;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/** Newest FoodEx2 CSV in the data directory, with the version from its name. */
function findCatalogueCsv(): { csvPath: string; version: string } | null {
  if (!fs.existsSync(DATA_DIR)) return null;

  const matches = fs
    .readdirSync(DATA_DIR)
    .map((file) => ({ file, match: CSV_PATTERN.exec(file) }))
    .filter((entry): entry is { file: string; match: RegExpExecArray } =>
      Boolean(entry.match),
    )
    .sort((a, b) =>
      b.match[1].localeCompare(a.match[1], undefined, { numeric: true }),
    );

  if (matches.length === 0) return null;
  return {
    csvPath: path.join(DATA_DIR, matches[0].file),
    version: matches[0].match[1],
  };
}

export function parseFoodex2Csv(content: string): {
  rows: Foodex2CsvRow[];
  duplicateCodes: string[];
} {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
  const header = parseCsvLine(lines.shift() ?? '');
  const indexOf = (column: string) => header.indexOf(column);

  const columns = {
    code: indexOf('code'),
    name: indexOf('name'),
    shortName: indexOf('shortName'),
    detailLevel: indexOf('detailLevel'),
    termType: indexOf('termType'),
    parentCode: indexOf('parentCode'),
    order: indexOf('order'),
    reportable: indexOf('reportable'),
  };
  const missing = Object.entries(columns)
    .filter(([, index]) => index === -1)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`FoodEx2 CSV is missing columns: ${missing.join(', ')}`);
  }

  const seen = new Set<string>();
  const duplicateCodes: string[] = [];
  const rows: Foodex2CsvRow[] = [];

  for (const line of lines) {
    const fields = parseCsvLine(line);
    const code = fields[columns.code]?.trim();
    // A term without a code cannot be identified, and a duplicate code would
    // make the vocabulary ambiguous — both are reported, never silently kept.
    if (!code) continue;
    if (seen.has(code)) {
      duplicateCodes.push(code);
      continue;
    }
    seen.add(code);

    rows.push({
      code,
      name: fields[columns.name]?.trim() ?? '',
      shortName: fields[columns.shortName]?.trim() ?? '',
      detailLevel: fields[columns.detailLevel]?.trim() ?? '',
      termType: fields[columns.termType]?.trim() ?? '',
      parentCode: fields[columns.parentCode]?.trim() ?? '',
      order: fields[columns.order]?.trim() ?? '',
      reportable: fields[columns.reportable]?.trim() ?? 'true',
    });
  }

  return { rows, duplicateCodes };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Upserts terms by code.
 *
 * Parent links are applied in a second pass: `parentCode` is a self-referencing
 * foreign key and the catalogue is not ordered parents-first, so every code has
 * to exist before any of them can point at another.
 */
async function upsertTerms(
  prisma: PrismaClient,
  rows: Foodex2CsvRow[],
  mtxVersion: string,
): Promise<void> {
  for (const batch of chunk(rows, CHUNK_SIZE)) {
    await prisma.$executeRaw`
      INSERT INTO "foodex2_terms" (
        "id", "createdAt", "updatedAt", "code", "name", "nameEn", "shortName",
        "synonyms", "detailLevel", "termType", "isCore", "reportable",
        "termOrder", "mtxVersion"
      )
      SELECT
        t.id, NOW(), NOW(), t.code, t.name, t.name, NULLIF(t.short_name, ''),
        ARRAY[]::text[], t.detail_level, t.term_type,
        t.detail_level = ${FOODEX2_DETAIL_LEVEL.CORE}, t.reportable,
        t.term_order, ${mtxVersion}
      FROM UNNEST(
        ${batch.map(() => randomUUID())}::text[],
        ${batch.map((r) => r.code)}::text[],
        ${batch.map((r) => r.name)}::text[],
        ${batch.map((r) => r.shortName)}::text[],
        ${batch.map((r) => r.detailLevel)}::text[],
        ${batch.map((r) => r.termType)}::text[],
        ${batch.map((r) => r.reportable !== 'false')}::boolean[],
        ${batch.map((r) => (r.order === '' ? null : Number(r.order)))}::integer[]
      ) AS t(id, code, name, short_name, detail_level, term_type, reportable, term_order)
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "nameEn" = EXCLUDED."nameEn",
        "shortName" = EXCLUDED."shortName",
        "detailLevel" = EXCLUDED."detailLevel",
        "termType" = EXCLUDED."termType",
        "isCore" = EXCLUDED."isCore",
        "reportable" = EXCLUDED."reportable",
        "termOrder" = EXCLUDED."termOrder",
        "mtxVersion" = EXCLUDED."mtxVersion",
        "updatedAt" = NOW()
    `;
  }

  const known = new Set(rows.map((row) => row.code));
  const parented = rows.filter(
    (row) => row.parentCode !== '' && known.has(row.parentCode),
  );

  for (const batch of chunk(parented, CHUNK_SIZE)) {
    await prisma.$executeRaw`
      UPDATE "foodex2_terms" AS t
      SET "parentCode" = v.parent_code, "updatedAt" = NOW()
      FROM UNNEST(
        ${batch.map((r) => r.code)}::text[],
        ${batch.map((r) => r.parentCode)}::text[]
      ) AS v(code, parent_code)
      WHERE t."code" = v.code
        AND t."parentCode" IS DISTINCT FROM v.parent_code
    `;
  }
}

export async function seedFoodex2(
  prisma: PrismaClient,
): Promise<Foodex2ImportReport> {
  const report: Foodex2ImportReport = {
    mtxVersion: null,
    termsImported: 0,
    coreTerms: 0,
    duplicateCodes: [],
    nevoTotal: 0,
    nevoWithoutFoodex2Code: [],
    unknownFoodex2Codes: [],
    unresolvedFoodex2Codes: [],
    mappedConcepts: 0,
    fallbackConcepts: 0,
    mappedNevoItems: 0,
    tiedCanonicalConcepts: [],
    coreTermsWithoutNevo: 0,
  };

  const catalogue = findCatalogueCsv();
  if (!catalogue) {
    console.warn(
      `No FoodEx2 catalogue CSV found in ${DATA_DIR}; skipping FoodEx2 import.\n` +
        '   Generate one with: npm run foodex2:extract -- <MTX_FULL_x_y.ecf>',
    );
    return report;
  }

  console.log(`\n🌱 Seeding FoodEx2 terms from ${catalogue.csvPath}...`);
  const { rows, duplicateCodes } = parseFoodex2Csv(
    fs.readFileSync(catalogue.csvPath, 'utf-8'),
  );

  report.mtxVersion = catalogue.version;
  report.duplicateCodes = duplicateCodes;
  report.termsImported = rows.length;
  report.coreTerms = rows.filter(
    (row) => row.detailLevel === FOODEX2_DETAIL_LEVEL.CORE,
  ).length;

  await upsertTerms(prisma, rows, catalogue.version);

  const mappingReport = await rebuildFoodex2NevoMappings(prisma);
  return { ...report, ...mappingReport };
}

/**
 * Rebuilds the FoodEx2 → NEVO mapping table from the codes already stored on
 * `GenericFood`. No second mapping source is introduced: the NEVO dataset stays
 * the authority on which FoodEx2 term a food belongs to.
 */
export async function rebuildFoodex2NevoMappings(
  prisma: PrismaClient,
): Promise<
  Pick<
    Foodex2ImportReport,
    | 'nevoTotal'
    | 'nevoWithoutFoodex2Code'
    | 'unknownFoodex2Codes'
    | 'unresolvedFoodex2Codes'
    | 'mappedConcepts'
    | 'fallbackConcepts'
    | 'mappedNevoItems'
    | 'tiedCanonicalConcepts'
    | 'coreTermsWithoutNevo'
  >
> {
  const terms = await prisma.foodex2Term.findMany({
    select: { code: true, detailLevel: true, parentCode: true },
  });
  const nodes = new Map<string, Foodex2HierarchyNode>(
    terms.map((term) => [term.code, term]),
  );

  const genericFoods = await prisma.genericFood.findMany({
    select: { nevoCode: true, foodName: true, foodex2Codes: true },
    orderBy: { nevoCode: 'asc' },
  });

  const nevoWithoutFoodex2Code: number[] = [];
  const unknownFoodex2Codes = new Set<string>();
  const unresolvedFoodex2Codes = new Set<string>();
  const fallbackConcepts = new Set<string>();
  const byConcept = new Map<string, NevoCandidate[]>();

  for (const food of genericFoods) {
    const baseCode = parseFoodex2BaseCode(food.foodex2Codes);
    if (!baseCode) {
      nevoWithoutFoodex2Code.push(food.nevoCode);
      continue;
    }
    if (!nodes.has(baseCode)) {
      unknownFoodex2Codes.add(baseCode);
      continue;
    }

    const resolution = resolveConceptCode(
      baseCode,
      nodes,
      FOODEX2_CANONICAL_CONFIG,
    );
    if (!resolution) {
      unresolvedFoodex2Codes.add(baseCode);
      continue;
    }
    if (resolution.via === 'fallback') {
      fallbackConcepts.add(resolution.conceptCode);
    }

    const candidates = byConcept.get(resolution.conceptCode) ?? [];
    candidates.push({
      nevoCode: food.nevoCode,
      foodName: food.foodName,
      sourceFoodex2Code: baseCode,
      hierarchyDepth: resolution.hierarchyDepth,
    });
    byConcept.set(resolution.conceptCode, candidates);
  }

  const tiedCanonicalConcepts: string[] = [];
  const mappingRows: Prisma.Foodex2NevoMappingCreateManyInput[] = [];

  for (const [conceptCode, candidates] of byConcept) {
    const { canonical, ranked, tiedCandidates } = selectCanonicalNevo(
      candidates,
      FOODEX2_CANONICAL_CONFIG,
    );
    if (tiedCandidates.length > 0) tiedCanonicalConcepts.push(conceptCode);

    for (const candidate of ranked) {
      mappingRows.push({
        foodex2Code: conceptCode,
        nevoCode: candidate.nevoCode,
        sourceFoodex2Code: candidate.sourceFoodex2Code,
        hierarchyDepth: candidate.hierarchyDepth,
        isCanonical: candidate.nevoCode === canonical?.nevoCode,
        priority: candidate.priority,
        selectionReason: candidate.selectionReason,
      });
    }
  }

  // Full replace keeps the import reproducible: a NEVO record that lost its
  // FoodEx2 code, or a concept that changed shape, leaves no stale mapping.
  await prisma.$transaction([
    prisma.foodex2NevoMapping.deleteMany({}),
    ...chunk(mappingRows, CHUNK_SIZE).map((batch) =>
      prisma.foodex2NevoMapping.createMany({ data: batch }),
    ),
  ]);

  const coreTermsWithoutNevo = await prisma.foodex2Term.count({
    where: { isCore: true, nevoMappings: { none: {} } },
  });

  return {
    nevoTotal: genericFoods.length,
    nevoWithoutFoodex2Code,
    unknownFoodex2Codes: [...unknownFoodex2Codes].sort(),
    unresolvedFoodex2Codes: [...unresolvedFoodex2Codes].sort(),
    mappedConcepts: byConcept.size,
    fallbackConcepts: fallbackConcepts.size,
    mappedNevoItems: mappingRows.length,
    tiedCanonicalConcepts,
    coreTermsWithoutNevo,
  };
}

/** Prints the data-quality report; problems are surfaced, never swallowed. */
export function printFoodex2Report(report: Foodex2ImportReport): void {
  const sample = (values: (string | number)[], limit = 10) =>
    values.length <= limit
      ? values.join(', ')
      : `${values.slice(0, limit).join(', ')}, … (+${values.length - limit})`;

  console.log('\nFoodEx2 import');
  console.log('--------------');
  console.log(`MTX version:            ${report.mtxVersion ?? 'not imported'}`);
  console.log(`Imported terms:         ${report.termsImported}`);
  console.log(`Core terms:             ${report.coreTerms}`);

  console.log('\nNEVO mappings');
  console.log('-------------');
  console.log(`NEVO records:           ${report.nevoTotal}`);
  console.log(`Mapped FoodEx2 foods:   ${report.mappedConcepts}`);
  console.log(`  via M/P fallback:     ${report.fallbackConcepts}`);
  console.log(`Mapped NEVO items:      ${report.mappedNevoItems}`);
  console.log(`Core foods w/o NEVO:    ${report.coreTermsWithoutNevo}`);

  const warnings: [string, (string | number)[]][] = [
    ['Duplicate FoodEx2 codes in CSV', report.duplicateCodes],
    ['NEVO records without a FoodEx2 code', report.nevoWithoutFoodex2Code],
    ['FoodEx2 codes in NEVO missing from MTX', report.unknownFoodex2Codes],
    ['FoodEx2 codes with no usable concept', report.unresolvedFoodex2Codes],
    ['Concepts with tied canonical candidates', report.tiedCanonicalConcepts],
  ];

  const reported = warnings.filter(([, values]) => values.length > 0);
  if (reported.length === 0) {
    console.log('\n✅ No FoodEx2 data-quality issues detected.');
    return;
  }

  console.log('\n⚠️  Data quality');
  console.log('---------------');
  for (const [label, values] of reported) {
    console.log(`${label}: ${values.length}`);
    console.log(`   ${sample(values)}`);
  }
}
