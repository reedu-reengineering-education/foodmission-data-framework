import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildExportSheets,
  importTranslations,
  parseFullKey,
  toFullKey,
  writeSpreadsheet,
} from '../../../scripts/i18n/translation-handoff';

describe('translation handoff', () => {
  describe('keys', () => {
    const namespaces = ['catalog', 'common'] as const;

    it('builds and parses full keys', () => {
      expect(toFullKey('catalog', 'genders.MALE')).toBe('catalog.genders.MALE');
      expect(parseFullKey('catalog.genders.MALE', namespaces)).toEqual({
        namespace: 'catalog',
        key: 'genders.MALE',
      });
      expect(parseFullKey('common.app.name', namespaces)).toEqual({
        namespace: 'common',
        key: 'app.name',
      });
    });

    it('rejects keys without a namespace prefix', () => {
      expect(parseFullKey('catalog', namespaces)).toBeUndefined();
      expect(parseFullKey('unknown.genders.MALE', namespaces)).toBeUndefined();
    });
  });

  describe('roundtrip', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-handoff-'));
    const outPath = path.join(tmpDir, 'handoff.xlsx');

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('exports and imports a single locale change', () => {
      const { sheets } = buildExportSheets({
        out: outPath,
        format: 'xlsx',
        locales: ['de'],
        namespaces: ['common'],
      });

      sheets.de = sheets.de.map((row) =>
        row.key === 'common.app.name'
          ? { ...row, translation: 'Foodmission Test Export' }
          : row,
      );

      writeSpreadsheet(sheets, outPath, 'xlsx');

      const report = importTranslations({ file: outPath, dryRun: true });
      expect(report.updated).toContain('de/common.app.name');
      expect(report.skipped.blank_cell).toHaveLength(0);
    });
  });
});
