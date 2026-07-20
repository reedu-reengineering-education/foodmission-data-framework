import {
  buildTranslationRows,
  importNevoCsv,
  LOCALE_COLUMNS,
  parseCsvRecords,
  parseNevoTranslationsCsv,
} from '../../../scripts/seeds/import-nevo-translations';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FIXTURE = path.join(
  __dirname,
  '../../fixtures/nevo-translations.sample.csv',
);

describe('nevo translations import', () => {
  it('includes nl with remark and synonym columns', () => {
    expect(LOCALE_COLUMNS.nl).toEqual({
      foodName: 'food_name_nl',
      foodGroup: 'food_group_nl',
      remark: 'remark_nl',
      synonym: 'synonym_nl',
    });
  });

  it('uses food_name_no and food_group_no for Norwegian', () => {
    expect(LOCALE_COLUMNS.no).toEqual({
      foodName: 'food_name_no',
      foodGroup: 'food_group_no',
    });
  });

  it('parses quoted CSV fields with commas', () => {
    const content = fs.readFileSync(FIXTURE, 'utf-8');
    const records = parseCsvRecords(content);
    expect(records).toHaveLength(2);
    expect(records[0]['food_name_de']).toBe('Kartoffeln, roh');
    expect(records[1]['food_name_no']).toBe('Nye poteter, rå');
  });

  it('parses nevo rows with locale translations', () => {
    const content = fs.readFileSync(FIXTURE, 'utf-8');
    const rows = parseNevoTranslationsCsv(content);
    expect(rows).toHaveLength(2);
    expect(rows[0].nevoCode).toBe(1);
    expect(rows[0].translations.nl.foodName).toBe('Aardappelen rauw');
    expect(rows[0].translations.no.foodName).toBe('Rå poteter');
    expect(rows[0].translations.de.foodGroup).toBe('Kartoffeln und Knollen');
    expect(rows[0].translations.sl.foodName).toBe('Surovi krompir');
  });

  it('expands one food into 18 translation rows (8 locales × 2 fields + nl remark/synonym slots skipped when blank)', () => {
    const content = fs.readFileSync(FIXTURE, 'utf-8');
    const csvRows = parseNevoTranslationsCsv(content).slice(0, 1);
    const idByNevoCode = new Map([[1, 'food-uuid-1']]);

    const { translationRows, skippedBlank, skippedUnknownNevoCode } =
      buildTranslationRows(csvRows, idByNevoCode);

    expect(translationRows).toHaveLength(16);
    expect(skippedBlank).toBe(2);
    expect(skippedUnknownNevoCode).toBe(0);
    expect(translationRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'food-uuid-1',
          locale: 'nl',
          field: 'foodName',
          value: 'Aardappelen rauw',
        }),
        expect.objectContaining({
          entityId: 'food-uuid-1',
          locale: 'no',
          field: 'foodName',
          value: 'Rå poteter',
        }),
        expect.objectContaining({
          entityId: 'food-uuid-1',
          locale: 'de',
          field: 'foodGroup',
          value: 'Kartoffeln und Knollen',
        }),
      ]),
    );
  });

  it('skips foods with unknown nevoCode', () => {
    const content = fs.readFileSync(FIXTURE, 'utf-8');
    const csvRows = parseNevoTranslationsCsv(content);
    const idByNevoCode = new Map([[1, 'food-uuid-1']]);

    const { translationRows, skippedUnknownNevoCode } = buildTranslationRows(
      csvRows,
      idByNevoCode,
    );

    expect(translationRows).toHaveLength(16);
    expect(skippedUnknownNevoCode).toBe(1);
  });

  it('dry-run does not call prisma mutations', async () => {
    const prismaMock = {
      genericFood: {
        findMany: jest.fn().mockResolvedValue([{ id: 'food-uuid-1', nevoCode: 1 }]),
      },
      $transaction: jest.fn(),
    } as any;

    const report = await importNevoCsv(prismaMock, {
      file: FIXTURE,
      dryRun: true,
      batchSize: 100,
    });

    expect(report.upsertedTranslations).toBe(16);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
