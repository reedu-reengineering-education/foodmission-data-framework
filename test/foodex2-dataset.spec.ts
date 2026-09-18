import * as fs from 'fs';
import * as path from 'path';
import { parseFoodex2Csv } from '../scripts/seeds/prod/foodex2';
import { parseFoodex2TranslationsCsv } from '../scripts/seeds/prod/foodex2-translations';
import {
  Foodex2HierarchyNode,
  NevoCandidate,
  parseFoodex2BaseCode,
  resolveConceptCode,
  selectCanonicalNevo,
} from '../src/generic-foods/foodex2/foodex2-resolution';
import { FOODEX2_DETAIL_LEVEL } from '../src/generic-foods/foodex2/foodex2-canonical.config';

/**
 * Runs the real shipped datasets through the real resolution code.
 *
 * This is the test that would catch a bad catalogue upgrade or a NEVO refresh
 * that breaks the mapping, and it needs no database — the importer's only
 * non-pure step is writing the rows it produces here.
 */

const FOODEX2_CSV = path.join(
  __dirname,
  '..',
  'prisma',
  'seeds',
  'data',
  'foodex2',
  'foodex2-mtx-12.0.csv',
);
const NEVO_CSV = path.join(
  __dirname,
  '..',
  'prisma',
  'seeds',
  'data',
  'nevo',
  'nevo2025-langual-foodex2.csv',
);

/** Mirrors how the NEVO importer splits a FoodEx2 expression into codes. */
function splitNevoFoodex2(raw: string): string[] {
  return raw
    .replace(/"/g, '')
    .trim()
    .split(/[#$;,\s]+/)
    .filter(Boolean);
}

interface NevoRow {
  nevoCode: number;
  foodName: string;
  foodex2Codes: string[];
}

function readNevoRows(): NevoRow[] {
  const lines = fs
    .readFileSync(NEVO_CSV, 'utf-8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  lines.shift();

  return lines.map((line) => {
    const fields = line.split(',');
    return {
      nevoCode: Number(fields[0]),
      foodName: fields[2],
      // LanguaL codes sit in field 3; the FoodEx2 expression is the last field.
      foodex2Codes: splitNevoFoodex2(fields[fields.length - 1]),
    };
  });
}

describe('FoodEx2 dataset', () => {
  const csvContent = fs.readFileSync(FOODEX2_CSV, 'utf-8');
  const { rows: terms, duplicateCodes } = parseFoodex2Csv(csvContent);
  const nodes = new Map<string, Foodex2HierarchyNode>(
    terms.map((term) => [
      term.code,
      {
        code: term.code,
        detailLevel: term.detailLevel,
        parentCode: term.parentCode === '' ? null : term.parentCode,
      },
    ]),
  );
  const nevoRows = readNevoRows();

  describe('import', () => {
    it('imports the published MTX terms', () => {
      expect(terms).toHaveLength(29908);
      expect(
        terms.filter((t) => t.detailLevel === FOODEX2_DETAIL_LEVEL.CORE),
      ).toHaveLength(7636);
    });

    it('has unique FoodEx2 codes', () => {
      expect(duplicateCodes).toEqual([]);
      expect(new Set(terms.map((t) => t.code)).size).toBe(terms.length);
    });

    it('gives every term a code and a name', () => {
      expect(terms.filter((t) => !t.code || !t.name)).toEqual([]);
    });

    it('references only real parents, apart from the catalogue root sentinel', () => {
      // EFSA anchors the tree on a literal "root" parent that is not itself a
      // term. The importer only writes parent links whose target exists, so
      // that row lands with a null parent rather than a broken foreign key.
      const orphans = terms.filter(
        (t) => t.parentCode !== '' && !nodes.has(t.parentCode),
      );
      expect(orphans.map((t) => t.parentCode)).toEqual(['root']);
    });

    it('parses identically on a re-run, so the import is idempotent', () => {
      expect(parseFoodex2Csv(csvContent).rows).toEqual(terms);
    });

    it('reports duplicate codes rather than silently keeping the last one', () => {
      const withDuplicate = `code,name,shortName,detailLevel,termType,parentCode,order,reportable
A007L,Dried pasta,,C,s,A007G,1,true
A007L,Dried pasta again,,C,s,A007G,1,true`;
      const result = parseFoodex2Csv(withDuplicate);

      expect(result.rows).toHaveLength(1);
      expect(result.duplicateCodes).toEqual(['A007L']);
    });
  });

  describe('NEVO mapping', () => {
    const resolutions = nevoRows.map((row) => {
      const baseCode = parseFoodex2BaseCode(row.foodex2Codes);
      return {
        row,
        baseCode,
        resolution: baseCode ? resolveConceptCode(baseCode, nodes) : null,
      };
    });

    const byConcept = new Map<string, NevoCandidate[]>();
    for (const { row, baseCode, resolution } of resolutions) {
      if (!resolution || !baseCode) continue;
      const candidates = byConcept.get(resolution.conceptCode) ?? [];
      candidates.push({
        nevoCode: row.nevoCode,
        foodName: row.foodName,
        sourceFoodex2Code: baseCode,
        hierarchyDepth: resolution.hierarchyDepth,
      });
      byConcept.set(resolution.conceptCode, candidates);
    }

    it('resolves the overwhelming majority of NEVO records', () => {
      const resolved = resolutions.filter((r) => r.resolution !== null);
      // 2317 of 2328 in NEVO 2025 9.0 / MTX 12.0.
      expect(resolved.length / nevoRows.length).toBeGreaterThan(0.99);
    });

    it('collapses 2328 NEVO records into a few hundred searchable foods', () => {
      expect(byConcept.size).toBeGreaterThan(400);
      expect(byConcept.size).toBeLessThan(nevoRows.length / 3);
    });

    it('rolls NEVO records filed under extended terms up to a core term', () => {
      // Most NEVO FoodEx2 codes are extended terms, not core ones, so a plain
      // code equality join would miss them entirely.
      const rolledUp = resolutions.filter(
        (r) => r.resolution && r.resolution.hierarchyDepth > 0,
      );
      expect(rolledUp.length).toBeGreaterThan(0);
    });

    it('maps every NEVO record to at most one concept', () => {
      const conceptsPerNevo = new Map<number, Set<string>>();
      for (const [concept, candidates] of byConcept) {
        for (const candidate of candidates) {
          const set = conceptsPerNevo.get(candidate.nevoCode) ?? new Set();
          set.add(concept);
          conceptsPerNevo.set(candidate.nevoCode, set);
        }
      }
      expect([...conceptsPerNevo.values()].filter((s) => s.size > 1)).toEqual(
        [],
      );
    });

    it('reports codes it cannot resolve instead of dropping them quietly', () => {
      const unresolved = resolutions
        .filter((r) => r.baseCode && !r.resolution)
        .map((r) => r.baseCode);
      // Four codes are newer than MTX 12.0 and two have no usable ancestor.
      expect(new Set(unresolved).size).toBeLessThanOrEqual(6);
    });

    describe('the pasta case', () => {
      const pastaConcept = 'A007L';
      const candidates = byConcept.get(pastaConcept) ?? [];

      it('exposes one "Dried pasta" concept, not one result per NEVO variant', () => {
        expect(terms.find((t) => t.code === pastaConcept)?.name).toBe(
          'Dried pasta',
        );
        expect(candidates.length).toBeGreaterThan(1);
      });

      it('elects the dry, unfortified NEVO record as canonical', () => {
        const { canonical } = selectCanonicalNevo(candidates);

        expect(canonical?.nevoCode).toBe(4);
        expect(canonical?.foodName).toBe('Pasta white raw');
      });

      it('does not elect a boiled variant, whose water content differs', () => {
        const { canonical } = selectCanonicalNevo(candidates);
        expect(canonical?.foodName).not.toMatch(/boiled/i);
      });
    });

    it('elects exactly one canonical record for every concept', () => {
      for (const [, candidates] of byConcept) {
        const { canonical, ranked } = selectCanonicalNevo(candidates);
        expect(canonical).not.toBeNull();
        expect(
          ranked.filter((c) => c.nevoCode === canonical?.nevoCode),
        ).toHaveLength(1);
      }
    });

    it('elects the same canonical record on a re-run', () => {
      for (const [, candidates] of byConcept) {
        const first = selectCanonicalNevo(candidates).canonical?.nevoCode;
        const shuffled = selectCanonicalNevo([...candidates].reverse())
          .canonical?.nevoCode;
        expect(shuffled).toBe(first);
      }
    });
  });
});

describe('FoodEx2 concept translations', () => {
  const TRANSLATIONS_CSV = path.join(
    __dirname,
    '..',
    'prisma',
    'seeds',
    'data',
    'foodex2',
    'foodex2-translations.csv',
  );

  const csvContent = fs.readFileSync(TRANSLATIONS_CSV, 'utf-8');
  const { header, rows } = parseFoodex2TranslationsCsv(csvContent);
  const locales = ['no', 'de', 'el', 'es', 'it', 'nl', 'pl', 'sl'];

  const { rows: terms } = parseFoodex2Csv(
    fs.readFileSync(FOODEX2_CSV, 'utf-8'),
  );
  const nameByCode = new Map(terms.map((t) => [t.code, t.name]));

  it('carries one column per supported locale', () => {
    expect(header.slice(0, 2)).toEqual(['code', 'en']);
    for (const locale of locales) {
      expect(header).toContain(locale);
    }
  });

  it('has no duplicate FoodEx2 codes', () => {
    const codes = rows.map((row) => row.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('references only codes that exist in the catalogue', () => {
    const unknown = rows.filter((row) => !nameByCode.has(row.code));
    expect(unknown.map((row) => row.code)).toEqual([]);
  });

  it('keeps the English column in sync with the catalogue name', () => {
    // A drifting English column means the translation was made against an
    // older MTX release and may no longer describe the same concept.
    const drifted = rows.filter((row) => nameByCode.get(row.code) !== row.en);
    expect(drifted.map((row) => row.code)).toEqual([]);
  });

  it('has a translation in every locale for every concept', () => {
    const blanks = rows.flatMap((row) =>
      locales
        .filter((locale) => !row[locale]?.trim())
        .map((locale) => `${row.code}/${locale}`),
    );
    expect(blanks).toEqual([]);
  });

  it('parses identically on a re-run, so the import is idempotent', () => {
    expect(parseFoodex2TranslationsCsv(csvContent).rows).toEqual(rows);
  });
});
