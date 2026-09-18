import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import ExcelJS from 'exceljs';
import {
  parseEntityTranslationKey,
  readEntitySpreadsheet,
  toEntityTranslationKey,
  writeEntityWorkbook,
} from '../../../scripts/i18n/entity-translation-handoff';

describe('entity translation handoff keys', () => {
  it('builds GenericFood keys from nevoCode + field', () => {
    expect(toEntityTranslationKey('GenericFood', 1, 'foodName')).toBe(
      'GenericFood.1.foodName',
    );
    expect(toEntityTranslationKey('GenericFood', 2685, 'foodGroup')).toBe(
      'GenericFood.2685.foodGroup',
    );
  });

  it('builds learning catalog keys from business codes', () => {
    expect(toEntityTranslationKey('FoodFact', 'FF1.1.1', 'body')).toBe(
      'FoodFact.FF1.1.1.body',
    );
    expect(toEntityTranslationKey('Mission', 'M.A1.1', 'title')).toBe(
      'Mission.M.A1.1.title',
    );
    expect(toEntityTranslationKey('QuizOption', 'Q1.1.1:A', 'text')).toBe(
      'QuizOption.Q1.1.1:A.text',
    );
  });

  it('parses valid keys', () => {
    expect(parseEntityTranslationKey('GenericFood.1.foodName')).toEqual({
      entityType: 'GenericFood',
      naturalKey: '1',
      field: 'foodName',
    });
    expect(parseEntityTranslationKey('FoodFact.FF1.1.1.body')).toEqual({
      entityType: 'FoodFact',
      naturalKey: 'FF1.1.1',
      field: 'body',
    });
    expect(parseEntityTranslationKey('Mission.M.A1.1.whyItMatters')).toEqual({
      entityType: 'Mission',
      naturalKey: 'M.A1.1',
      field: 'whyItMatters',
    });
    expect(parseEntityTranslationKey('QuizOption.Q1.1.1:A.text')).toEqual({
      entityType: 'QuizOption',
      naturalKey: 'Q1.1.1:A',
      field: 'text',
    });
  });

  it('rejects invalid keys', () => {
    expect(parseEntityTranslationKey('GenericFood.1')).toBeUndefined();
    expect(parseEntityTranslationKey('GenericFood.1.title')).toBeUndefined();
    expect(parseEntityTranslationKey('Unknown.1.foodName')).toBeUndefined();
    expect(parseEntityTranslationKey('')).toBeUndefined();
  });
});

describe('entity handoff workbook layout', () => {
  const tmpDir = path.join(os.tmpdir(), 'entity-handoff-spec');

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const sheets = [
    {
      name: 'GenericFood',
      rows: [
        {
          key: 'GenericFood.1.foodName',
          en: 'Potatoes raw',
          translations: { de: 'Kartoffeln, roh', es: '' },
        },
      ],
    },
    {
      name: 'Foodex2Term',
      rows: [
        {
          key: 'Foodex2Term.A007L.name',
          en: 'Dried pasta',
          translations: { de: 'Getrocknete Nudeln', es: 'Pasta seca' },
        },
      ],
    },
  ];

  it('writes one sheet per entity type with a column per locale', async () => {
    const file = path.join(tmpDir, 'layout.xlsx');
    await writeEntityWorkbook(sheets, ['de', 'es'], file, 'xlsx');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);

    expect(workbook.worksheets.map((w) => w.name)).toEqual([
      'GenericFood',
      'Foodex2Term',
    ]);

    const header = (
      workbook.getWorksheet('Foodex2Term')!.getRow(1).values as unknown[]
    ).slice(1);
    // Same shape as the partner translation workbook.
    expect(header).toEqual(['key', 'en', 'de', 'es']);
  });

  it('keeps every locale for a key on one row', async () => {
    const file = path.join(tmpDir, 'row.xlsx');
    await writeEntityWorkbook(sheets, ['de', 'es'], file, 'xlsx');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    const row = (
      workbook.getWorksheet('Foodex2Term')!.getRow(2).values as unknown[]
    ).slice(1);

    expect(row).toEqual([
      'Foodex2Term.A007L.name',
      'Dried pasta',
      'Getrocknete Nudeln',
      'Pasta seca',
    ]);
  });

  it('round-trips through the importer', async () => {
    const file = path.join(tmpDir, 'roundtrip.xlsx');
    await writeEntityWorkbook(sheets, ['de', 'es'], file, 'xlsx');

    const rows = await readEntitySpreadsheet(file);

    expect(rows).toEqual(
      expect.arrayContaining([
        {
          locale: 'de',
          key: 'Foodex2Term.A007L.name',
          en: 'Dried pasta',
          translation: 'Getrocknete Nudeln',
        },
        {
          locale: 'es',
          key: 'GenericFood.1.foodName',
          en: 'Potatoes raw',
          translation: '',
        },
      ]),
    );
    // Two keys x two locales.
    expect(rows).toHaveLength(4);
  });

  it('still reads legacy workbooks with one sheet per locale', async () => {
    const file = path.join(tmpDir, 'legacy.xlsx');
    const workbook = new ExcelJS.Workbook();
    for (const locale of ['de', 'es']) {
      const sheet = workbook.addWorksheet(locale);
      sheet.columns = [
        { header: 'key', key: 'key' },
        { header: 'en', key: 'en' },
        { header: 'translation', key: 'translation' },
      ];
      sheet.addRow({
        key: 'GenericFood.1.foodName',
        en: 'Potatoes raw',
        translation: `legacy-${locale}`,
      });
    }
    await workbook.xlsx.writeFile(file);

    const rows = await readEntitySpreadsheet(file);

    // Vendor files already in flight must keep importing.
    expect(rows).toEqual([
      {
        locale: 'de',
        key: 'GenericFood.1.foodName',
        en: 'Potatoes raw',
        translation: 'legacy-de',
      },
      {
        locale: 'es',
        key: 'GenericFood.1.foodName',
        en: 'Potatoes raw',
        translation: 'legacy-es',
      },
    ]);
  });
});
