/**
 * Extracts a compact CSV of FoodEx2 terms from an EFSA MTX catalogue export.
 *
 * The upstream catalogue is published by EFSA as an `.ecf` file (a zip holding a
 * single ~88 MB XML). That is far too large to keep in the repository, so this
 * script distills it down to the columns the importer actually needs and writes
 * the result to `prisma/seeds/data/foodex2/`.
 *
 * Source (MTX FoodEx2 12.0):
 *   https://github.com/openefsa/efsa-catalogues/releases/download/12.0/MTX_FULL_12_0.ecf
 *
 * Usage:
 *   npm run foodex2:extract -- /path/to/MTX_FULL_12_0.ecf
 *   npm run foodex2:extract -- /path/to/MTX_FULL_12_0.xml
 *
 * Re-run this only when upgrading to a newer MTX release; day-to-day seeding
 * reads the generated CSV, not the catalogue.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import { execFileSync } from 'child_process';

/** Hierarchy whose parent/child links define the FoodEx2 master tree. */
const MASTER_HIERARCHY = 'MTX';

const OUTPUT_DIR = path.join(
  process.cwd(),
  'prisma',
  'seeds',
  'data',
  'foodex2',
);

export interface ExtractedTerm {
  code: string;
  name: string;
  shortName: string;
  detailLevel: string;
  termType: string;
  parentCode: string;
  order: string;
  reportable: string;
}

export const FOODEX2_CSV_COLUMNS = [
  'code',
  'name',
  'shortName',
  'detailLevel',
  'termType',
  'parentCode',
  'order',
  'reportable',
] as const satisfies readonly (keyof ExtractedTerm)[];

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&amp;/g, '&');
}

function tag(block: string, name: string): string {
  const match = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(block);
  return match ? decodeXmlEntities(match[1]).trim() : '';
}

/** Reads an `<implicitAttribute>` value, e.g. `detailLevel` or `termType`. */
function implicitAttribute(block: string, attributeCode: string): string {
  const match = new RegExp(
    `<implicitAttribute>\\s*<attributeCode>${attributeCode}</attributeCode>` +
      `\\s*<attributeValues>([\\s\\S]*?)</attributeValues>`,
  ).exec(block);
  if (!match) return '';
  const first = /<attributeValue>([\s\S]*?)<\/attributeValue>/.exec(match[1]);
  return first ? decodeXmlEntities(first[1]).trim() : '';
}

/** Pulls the parent link from the MTX master hierarchy assignment. */
function masterAssignment(block: string): {
  parentCode: string;
  order: string;
  reportable: string;
} {
  const assignments = block.match(
    /<hierarchyAssignment>[\s\S]*?<\/hierarchyAssignment>/g,
  );
  for (const assignment of assignments ?? []) {
    if (tag(assignment, 'hierarchyCode') !== MASTER_HIERARCHY) continue;
    return {
      parentCode: tag(assignment, 'parentCode'),
      order: tag(assignment, 'order'),
      reportable: tag(assignment, 'reportable') || 'true',
    };
  }
  return { parentCode: '', order: '', reportable: 'true' };
}

export function parseTermBlock(block: string): ExtractedTerm | null {
  const code = tag(block, 'termCode');
  if (!code) return null;
  const { parentCode, order, reportable } = masterAssignment(block);
  return {
    code,
    name: tag(block, 'termExtendedName'),
    shortName: tag(block, 'termShortName'),
    detailLevel: implicitAttribute(block, 'detailLevel'),
    termType: implicitAttribute(block, 'termType'),
    parentCode,
    order,
    reportable,
  };
}

function toCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Unzips an `.ecf` into a temp dir and returns the contained XML path. */
function resolveXmlPath(input: string): { xmlPath: string; tempDir?: string } {
  if (input.toLowerCase().endsWith('.xml')) return { xmlPath: input };

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foodex2-mtx-'));
  execFileSync('unzip', ['-o', '-q', input, '-d', tempDir]);
  const xml = fs
    .readdirSync(tempDir)
    .find((f) => f.toLowerCase().endsWith('.xml'));
  if (!xml) {
    throw new Error(`No XML found inside ${input}`);
  }
  return { xmlPath: path.join(tempDir, xml), tempDir };
}

async function extract(input: string): Promise<void> {
  const { xmlPath, tempDir } = resolveXmlPath(input);

  // The header carries the catalogue version, which names the output file.
  const head = fs.readFileSync(xmlPath, { encoding: 'utf-8' }).slice(0, 4000);
  const version = /<catalogueVersion>[\s\S]*?<version>(.*?)<\/version>/
    .exec(head)?.[1]
    ?.trim();
  if (!version) {
    throw new Error('Could not read <catalogueVersion> from the catalogue.');
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `foodex2-mtx-${version}.csv`);
  const out = fs.createWriteStream(outputPath, { encoding: 'utf-8' });
  out.write(`${FOODEX2_CSV_COLUMNS.join(',')}\n`);

  const rl = readline.createInterface({
    input: fs.createReadStream(xmlPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let buffer: string[] | null = null;
  let count = 0;
  const byDetailLevel = new Map<string, number>();

  for await (const line of rl) {
    if (line.includes('<term>')) buffer = [];
    if (buffer) buffer.push(line);
    if (!line.includes('</term>') || !buffer) continue;

    const term = parseTermBlock(buffer.join('\n'));
    buffer = null;
    if (!term) continue;

    count += 1;
    byDetailLevel.set(
      term.detailLevel,
      (byDetailLevel.get(term.detailLevel) ?? 0) + 1,
    );
    out.write(
      `${FOODEX2_CSV_COLUMNS.map((c) => toCsvField(term[c])).join(',')}\n`,
    );
  }

  await new Promise<void>((resolve) => out.end(resolve));
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });

  console.log(`FoodEx2 MTX ${version} → ${outputPath}`);
  console.log(`  terms: ${count}`);
  for (const [level, n] of [...byDetailLevel].sort()) {
    console.log(`  detailLevel ${level}: ${n}`);
  }
}

if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    console.error(
      'Usage: npm run foodex2:extract -- <MTX_FULL_x_y.ecf | MTX_FULL_x_y.xml>',
    );
    process.exit(1);
  }
  extract(input).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
