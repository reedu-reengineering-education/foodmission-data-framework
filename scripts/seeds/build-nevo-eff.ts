/**
 * Builds the EFF (EFSA Environmental Footprint of Food) seed CSVs:
 *
 *  - eff_footprints.csv.gz: per EFF product x country (27 EU + EU_27) x basis
 *    (retail/consumed) x life-cycle stage (incl. TOTAL), all 16 EF indicators,
 *    values copied as published.
 *  - nevo_eff_mapping.csv: NEVO food -> EFF product (FoodEx2 code), match
 *    type, preferred basis.
 *
 * Inputs (not committed, ~35 MB):
 *  - EFF database, Zenodo 17899564 (CC BY 4.0): "D2.2 contribution analysis
 *    retail.xlsx", "D2.2 contribution analysis consumer.xlsx",
 *    "D1.2 Guidance documentation - appendix.xlsx"
 *  - Full FoodEx2 MTX catalogue (official EFSA export, ~30k terms):
 *    MTX_FULL_12_0.ecf from https://github.com/openefsa/efsa-catalogues/releases
 *  - prisma/seeds/data/nevo/nevo2025-langual-foodex2.csv
 *
 * Usage:
 *   npm run db:build:eff -- <eff_dir> <MTX_FULL_12_0.ecf>
 *
 * Matching per NEVO food (first hit wins): manual override, NEVO FoodEx2 base
 * term equals an EFF product code, EFF lists the NEVO food as its modelling
 * proxy, FoodEx2 parent, grandparent.
 */
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { gzipSync, inflateRawSync } from 'zlib';
import { parseCsvRecords } from './import-nevo-translations';

const DATA_DIR = path.join(process.cwd(), 'prisma', 'seeds', 'data');
const NEVO_CSV = path.join(DATA_DIR, 'nevo', 'nevo2025-langual-foodex2.csv');
const FOOTPRINTS_OUT = path.join(DATA_DIR, 'eff', 'eff_footprints.csv.gz');
const MAPPING_OUT = path.join(DATA_DIR, 'nevo', 'nevo_eff_mapping.csv');

/** Seed field name -> EFF contribution analysis column header. */
const INDICATORS = {
  acidification: 'Acidification (mol H+ eq/kg product)',
  climateChange: 'Climate change (kg CO2 eq/kg product)',
  particulateMatter: 'Particulate matter (disease inc./kg product)',
  eutrophicationMarine: 'Eutrophication, marine (kg N eq/kg product)',
  eutrophicationFreshwater: 'Eutrophication, freshwater (kg P eq/kg product)',
  eutrophicationTerrestrial:
    'Eutrophication, terrestrial (mol N eq/kg product)',
  humanToxicityCancer: 'Human toxicity, cancer (CTUh/kg product)',
  humanToxicityNonCancer: 'Human toxicity, non-cancer (CTUh/kg product)',
  ionisingRadiation: 'Ionising radiation (kBq U-235 eq/kg product)',
  landUse: 'Land use (Pt/kg product)',
  ozoneDepletion: 'Ozone depletion (kg CFC11 eq/kg product)',
  photochemicalOzoneFormation:
    'Photochemical ozone formation (kg NMVOC eq/kg product)',
  resourceUseFossils: 'Resource use, fossils (MJ/kg product)',
  resourceUseMineralsMetals:
    'Resource use, minerals and metals (kg Sb eq/kg product)',
  waterUse: 'Water use (m3 depriv./kg product)',
  ecotoxicityFreshwater: 'Ecotoxicity, freshwater (CTUe/kg product)',
} as const;
type Indicator = keyof typeof INDICATORS;
const INDICATOR_KEYS = Object.keys(INDICATORS) as Indicator[];

/** EFF stage label -> EffStage enum ("TOTAL" is the published total). */
const STAGES: Record<string, string> = {
  Total: 'TOTAL',
  'Animal production': 'ANIMAL_PRODUCTION',
  'Crop and processing logistics': 'CROP_AND_PROCESSING_LOGISTICS',
  Processing: 'PROCESSING',
  Packaging: 'PACKAGING',
  Distribution: 'DISTRIBUTION',
  Supermarket: 'SUPERMARKET',
  Consumption: 'CONSUMPTION',
  'End-of-life': 'END_OF_LIFE',
};
const STAGE_ORDER = Object.values(STAGES);

const COOKED =
  /\b(boiled|cooked|fried|baked|roasted|grilled|stewed|steamed|braised|poached|prepared|stir[- ]fried|deep[- ]fried|microwaved|au gratin|mashed|scrambled|pan[- ]fried|oven[- ]baked|barbecued|smoked and cooked)\b/i;

/** Manual review of proxy/parent matches. null = drop (leave unmatched),
 * string = force this EFF code. */
const OVERRIDES: Record<number, string | null> = {
  197: null, // baked beans in tomato sauce -> EFF proxy is soy/black bean sauce
  213: null, // oat flakes -> EFF product is water-based porridge (per kg ready-to-eat)
  296: null, // dried whole milk -> EFF proxy is whey protein
  621: null, // M&M's peanut -> peanuts
  1141: null, // mixed frozen vegetables -> peas
  2617: null, // bapao with meat -> leavened bread
  202: null, // coconut meat -> tree nuts
  5497: null, // grated dried coconut -> tree nuts
  2293: null, // tinned tomatoes -> EFF "preserved tomatoes" is modelled as sun-dried tomatoes in oil
  2498: null, // sieved tomatoes, same as above
  951: 'A00PE', // French beans boiled -> slicing bean (EFF proxy points to dry beans)
  843: 'A040D', // snack sausage roll -> sausage roll (parent would be bread)
  901: 'A040D',
};

/** EFF products whose retail unit is a dry/concentrated product and consumed
 * unit the diluted beverage/dish (coffee, tea, gelatine, whey, porridge). */
const DILUTION = new Set([
  'A03KE',
  'A03KD',
  'A03KC',
  'A03KF',
  'A167A',
  'A03LB',
  'A02PS',
  'A0F5E',
  'A03KB',
  'A0ESM',
]);
const DRY =
  /\b(powder|dried|leaves|beans|ground|granules|gelatin|instant powder)\b/i;

type Row = Record<string, string | number | null>;
/** code -> country -> stage -> indicator values */
type Footprints = Map<
  string,
  Map<string, Map<string, Record<Indicator, number>>>
>;

/** Cells can come back as rich text, hyperlinks or formula results. */
function cellValue(value: ExcelJS.CellValue): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((p) => p.text).join('');
    if ('text' in value) return cellValue(value.text);
    if ('result' in value) return cellValue(value.result);
    if (value instanceof Date) return value.toISOString();
  }
  return typeof value === 'boolean' ? String(value) : null;
}

function text(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

/** Streams one sheet as header-keyed rows; the header is row `headerRow`. */
async function readSheet(
  file: string,
  sheetName: string,
  headerRow = 1,
): Promise<Row[]> {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(file, {
    worksheets: 'emit',
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    styles: 'ignore',
  });
  for await (const worksheet of reader) {
    // `name` is set by the reader but missing from the typings
    if ((worksheet as unknown as { name: string }).name !== sheetName) {
      continue;
    }
    let header: string[] = [];
    const rows: Row[] = [];
    for await (const row of worksheet) {
      const values = (row.values as ExcelJS.CellValue[]).map(cellValue);
      if (row.number === headerRow) {
        header = values.map((v) => text(v));
      } else if (row.number > headerRow) {
        const record: Row = {};
        header.forEach((name, i) => {
          if (name) record[name] = values[i] ?? null;
        });
        rows.push(record);
      }
    }
    return rows;
  }
  throw new Error(`Sheet "${sheetName}" not found in ${file}`);
}

async function readFootprints(
  file: string,
): Promise<{ footprints: Footprints; names: Map<string, string> }> {
  const footprints: Footprints = new Map();
  const names = new Map<string, string>();
  for (const row of await readSheet(file, 'Contribution analysis')) {
    const code = text(row['FoodEx2 code']);
    const stage = STAGES[text(row.Stage)];
    if (!code || !stage) continue;
    names.set(code, text(row.Product).replace(/-+$/, '').trim());
    const values = {} as Record<Indicator, number>;
    for (const key of INDICATOR_KEYS) {
      const value = row[INDICATORS[key]];
      values[key] = value === null || value === '' ? NaN : Number(value);
    }
    const byCountry = footprints.get(code) ?? new Map();
    footprints.set(code, byCountry);
    const byStage = byCountry.get(text(row.Country)) ?? new Map();
    byCountry.set(text(row.Country), byStage);
    byStage.set(stage, values);
  }
  return { footprints, names };
}

/** An EFSA .ecf catalogue is a zip holding one XML file; returns that XML. */
function readEcf(file: string): string {
  const zip = fs.readFileSync(file);
  // End-of-central-directory record -> first central directory entry
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error(`${file} is not a zip (.ecf) file`);
  const central = zip.readUInt32LE(eocd + 16);
  const method = zip.readUInt16LE(central + 10);
  const compressedSize = zip.readUInt32LE(central + 20);
  const local = zip.readUInt32LE(central + 42);
  const start =
    local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
  const data = zip.subarray(start, start + compressedSize);
  return (method === 8 ? inflateRawSync(data) : data).toString('utf-8');
}

/** FoodEx2 hierarchy: reporting parent, fall back to master (MTX) parent. */
function readParents(mtxFile: string): Map<string, string> {
  const parent = new Map<string, string>();
  const xml = readEcf(mtxFile);
  for (const [term] of xml.matchAll(/<term>[\s\S]*?<\/term>/g)) {
    const code = /<termCode>([^<]+)<\/termCode>/.exec(term)?.[1];
    const parents = new Map(
      [
        ...term.matchAll(
          /<hierarchyCode>([^<]+)<\/hierarchyCode>\s*<parentCode>([^<]+)<\/parentCode>/g,
        ),
      ].map(([, hierarchy, parentCode]) => [hierarchy, parentCode]),
    );
    const p = parents.get('report') ?? parents.get('MTX');
    if (code && p && p !== code) parent.set(code, p);
  }
  return parent;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvLine(cells: (string | number)[]): string {
  return cells.map(csvCell).join(',') + '\n';
}

async function main() {
  const [effDir, mtxFile] = process.argv.slice(2);
  if (!effDir || !mtxFile) {
    console.error(
      'Usage: npm run db:build:eff -- <eff_dir> <MTX_FULL_12_0.ecf>',
    );
    process.exit(1);
  }

  console.log('Reading EFF retail, consumer and appendix workbooks...');
  const retail = await readFootprints(
    path.join(effDir, 'D2.2 contribution analysis retail.xlsx'),
  );
  const consumed = await readFootprints(
    path.join(effDir, 'D2.2 contribution analysis consumer.xlsx'),
  );
  const ret = retail.footprints;
  const con = consumed.footprints;
  const effCodes = new Set([...ret.keys(), ...con.keys()]);
  // retail name wins where both bases name a product
  const effName = new Map([...consumed.names, ...retail.names]);

  const parent = readParents(mtxFile);

  // EFF scope: product FoodEx2 -> NEVO proxy code, and its food category
  const proxy = new Map<number, string[]>();
  const category = new Map<string, string>();
  const scope = await readSheet(
    path.join(effDir, 'D1.2 Guidance documentation - appendix.xlsx'),
    'EFF scope',
    2,
  );
  for (const row of scope) {
    const code = text(row['Foodex2 code']);
    const cat = text(row['EFF Food category']);
    if (code && cat && !category.has(code)) category.set(code, cat);
    const nevo = Number(text(row['Nevo code']));
    if (
      effCodes.has(code) &&
      text(row['Nevo code']) &&
      Number.isInteger(nevo)
    ) {
      proxy.set(nevo, [...(proxy.get(nevo) ?? []), code]);
    }
  }

  const preferredBasis = (name: string, code: string) => {
    if (!ret.has(code)) return 'CONSUMED';
    if (DILUTION.has(code)) return DRY.test(name) ? 'RETAIL' : 'CONSUMED';
    return COOKED.test(name) ? 'CONSUMED' : 'RETAIL';
  };

  const mapping: (string | number)[][] = [];
  const stats: Record<string, number> = {};
  const nevoRecords = parseCsvRecords(fs.readFileSync(NEVO_CSV, 'utf-8'));
  for (const record of nevoRecords) {
    const nevo = Number.parseInt(record['NEVO-code'], 10);
    const name = record['English food name'];
    const base = (record['FoodEx2 code'] ?? '')
      .replace(/\s+/g, '')
      .split('#')[0];
    let match: string | null = null;
    let kind: string | null = null;

    if (nevo in OVERRIDES) {
      if (OVERRIDES[nevo] !== null) [match, kind] = [OVERRIDES[nevo], 'MANUAL'];
    } else if (effCodes.has(base)) {
      [match, kind] = [base, 'EXACT'];
    } else if (proxy.has(nevo)) {
      // several EFF products can share one NEVO proxy: prefer one on the
      // NEVO term's ancestor path
      const ancestors: string[] = [];
      let c: string | undefined = base;
      for (let i = 0; i < 4 && (c = parent.get(c)); i++) ancestors.push(c);
      const candidates = proxy.get(nevo)!;
      const preferred = candidates.filter((x) => ancestors.includes(x));
      [match, kind] = [
        (preferred.length ? preferred : [...candidates].sort())[0],
        'EFF_NEVO_PROXY',
      ];
    } else {
      let c: string | undefined = base;
      for (const depth of [1, 2]) {
        c = parent.get(c);
        if (!c) break;
        if (effCodes.has(c)) {
          [match, kind] = [c, `PARENT_${depth}`];
          break;
        }
      }
    }

    stats[kind ?? 'none'] = (stats[kind ?? 'none'] ?? 0) + 1;
    if (!match || !kind) continue;
    mapping.push([nevo, name, base, match, kind, preferredBasis(name, match)]);
  }

  fs.writeFileSync(
    MAPPING_OUT,
    csvLine([
      'NEVO-code',
      'English food name',
      'nevo_foodex2_base',
      'eff_foodex2_code',
      'match_type',
      'preferred_basis',
    ]) + mapping.map(csvLine).join(''),
  );

  const lines = [
    csvLine([
      'foodex2_code',
      'product',
      'category',
      'country',
      'basis',
      'stage',
      ...INDICATOR_KEYS,
    ]),
  ];
  let footprintCount = 0;
  for (const code of [...effCodes].sort()) {
    for (const [basis, data] of [
      ['RETAIL', ret],
      ['CONSUMED', con],
    ] as const) {
      const byCountry = data.get(code);
      if (!byCountry) continue;
      for (const country of [...byCountry.keys()].sort()) {
        const byStage = byCountry.get(country)!;
        for (const stage of STAGE_ORDER) {
          const values = byStage.get(stage);
          if (!values) continue;
          lines.push(
            csvLine([
              code,
              effName.get(code) ?? '',
              category.get(code) ?? '',
              country,
              basis,
              stage,
              ...INDICATOR_KEYS.map((k) =>
                Number.isNaN(values[k]) ? '' : values[k],
              ),
            ]),
          );
        }
        footprintCount += 1;
      }
    }
  }
  // gzip header mtime is 0, so rebuilding unchanged data gives identical bytes
  fs.writeFileSync(FOOTPRINTS_OUT, gzipSync(lines.join('')));

  console.log(JSON.stringify(stats));
  console.log(
    `${mapping.length} NEVO foods matched, ${effCodes.size} EFF products, ${footprintCount} footprints`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
