import { promises as fs } from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import TurndownService from 'turndown';

// Converts the per-partner FOODMISSION pilot consent forms / information
// letters from .docx to Markdown, renaming each output to the partner's country
// code (hvl -> no.md, reedu -> de.md, ...).
//
// Usage: `npm run docs:consent-forms -- [inputFolder] [outputFolder]`
// Defaults to ./docs/docx -> ./src/catalog/consent-forms (served by the catalog
// module's consent-form endpoint), relative to the repo root.
// Pass --keep-names to skip the partner -> country-code renaming.
const args = process.argv.slice(2);
const KEEP_NAMES = args.includes('--keep-names');
const positional = args.filter((arg) => !arg.startsWith('--'));
const INPUT_FOLDER = path.resolve(positional[0] ?? 'docs/docx');
const OUTPUT_FOLDER = path.resolve(
  positional[1] ?? 'src/catalog/consent-forms',
);

/**
 * FOODMISSION consortium (Grant Agreement 101181774, proposal Part B "List of
 * participants"). Incoming .docx filenames are not consistent, so each partner
 * lists the aliases that may show up in a filename. Aliases are matched against
 * the filename with all non-alphanumeric characters stripped, so
 * "CCIS CAFE_Foodmission_..." and "ccis-cafe-foodmission-..." both normalise to
 * "cciscafefoodmission" and hit the `cciscafe` alias.
 *
 * Country codes are ISO 3166-1 alpha-2, lowercased. Note Greece is `gr` here;
 * the EU forms use `EL` for the same country.
 */
type Partner = {
  /** Short name as used in the proposal. */
  name: string;
  /** ISO 3166-1 alpha-2, lowercase. Becomes the output filename. */
  country: string;
  /** Filename fragments, normalised (lowercase, alphanumeric only). */
  aliases: string[];
};

const PARTNERS: Partner[] = [
  { name: 'HVL', country: 'no', aliases: ['hvl', 'hogskulen', 'vestlandet'] },
  { name: 're:edu', country: 'de', aliases: ['reedu'] },
  {
    name: 'UTH',
    country: 'gr',
    aliases: ['uth', 'thessaly', 'thessalias', 'thessaloniki'],
  },
  {
    name: 'IELKA',
    country: 'gr',
    aliases: ['ielka', 'retailconsumergoods'],
  },
  { name: 'SPIX', country: 'es', aliases: ['spix', 'sphericalpixel'] },
  { name: 'UNIVR', country: 'it', aliases: ['univr', 'verona'] },
  { name: 'ADI', country: 'it', aliases: ['adiconsum', 'adi'] },
  { name: 'EUR', country: 'nl', aliases: ['eur', 'erasmus', 'rotterdam'] },
  {
    name: 'CRS',
    country: 'pl',
    aliases: ['crs', 'systemssolutions', 'centrumrozwiazan'],
  },
  {
    name: 'CCIS-CAFE',
    country: 'si',
    aliases: ['cciscafe', 'ccis', 'gospodarska', 'zbornica'],
  },
];

/** Longest aliases first so `cciscafe` wins over `ccis`, `adiconsum` over `adi`. */
const ALIAS_INDEX: { alias: string; partner: Partner }[] = PARTNERS.flatMap(
  (partner) => partner.aliases.map((alias) => ({ alias, partner })),
).sort((a, b) => b.alias.length - a.alias.length);

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Resolve a partner from a docx filename. Prefers an alias at the start of the
 * name (filenames here are `<PARTNER>_Foodmission_...`) and falls back to a
 * substring match anywhere in the name.
 */
export function matchPartner(fileName: string): Partner | undefined {
  const stem = normalise(path.basename(fileName, path.extname(fileName)));

  return (
    ALIAS_INDEX.find(({ alias }) => stem.startsWith(alias))?.partner ??
    ALIAS_INDEX.find(({ alias }) => stem.includes(alias))?.partner
  );
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// Word paragraphs often carry soft line breaks, which mammoth turns into <br>
// and turndown into a hard break ("  \n"). A Markdown ATX heading cannot span
// lines, so collapse any whitespace inside a heading into single spaces.
turndown.addRule('singleLineHeading', {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  replacement: (content: string, node: { nodeName: string }) => {
    const level = Number(node.nodeName.charAt(1));
    const text = content.replace(/\s+/g, ' ').trim();

    return text ? `\n\n${'#'.repeat(level)} ${text}\n\n` : '\n\n';
  },
});

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}

export async function docxToMarkdown(filePath: string): Promise<string> {
  const { value: html } = await mammoth.convertToHtml({ path: filePath });

  return htmlToMarkdown(html);
}

async function findDocxFiles(folder: string): Promise<string[]> {
  const entries = await fs.readdir(folder, { withFileTypes: true });

  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(folder, entry.name);

      if (entry.isDirectory()) {
        return findDocxFiles(fullPath);
      }

      // Skip Word lock files (~$foo.docx)
      const isDocx =
        entry.isFile() &&
        entry.name.toLowerCase().endsWith('.docx') &&
        !entry.name.startsWith('~$');

      return isDocx ? [fullPath] : [];
    }),
  );

  return files.flat();
}

/**
 * Output path for a converted file. With renaming enabled a matched partner
 * yields `<country>.md`; unmatched files and collisions keep enough of the
 * original stem to stay distinguishable.
 */
function resolveOutputPath(
  filePath: string,
  relative: string,
  taken: Map<string, string>,
): string {
  if (KEEP_NAMES) {
    return path.join(OUTPUT_FOLDER, relative.replace(/\.docx$/i, '.md'));
  }

  const stem = path.basename(filePath, path.extname(filePath));
  const partner = matchPartner(filePath);

  if (!partner) {
    console.warn(
      `  ! ${relative}: no partner matched, keeping original filename`,
    );
    return path.join(OUTPUT_FOLDER, `${stem}.md`);
  }

  const claimedBy = taken.get(partner.country);

  if (claimedBy) {
    // Two partners share a country (UTH/IELKA in GR, UNIVR/ADI in IT), or the
    // same partner has several documents. Keep both files rather than clobber.
    const disambiguated = `${partner.country}-${normalise(stem)}`;
    console.warn(
      `  ! ${relative}: "${partner.country}.md" already taken by ${claimedBy}, writing ${disambiguated}.md`,
    );
    return path.join(OUTPUT_FOLDER, `${disambiguated}.md`);
  }

  taken.set(partner.country, relative);
  return path.join(OUTPUT_FOLDER, `${partner.country}.md`);
}

async function main(): Promise<void> {
  const docxFiles = await findDocxFiles(INPUT_FOLDER).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Input folder not found: ${INPUT_FOLDER}`);
      process.exit(1);
    }
    throw error;
  });

  if (docxFiles.length === 0) {
    console.log(`No .docx files found in ${INPUT_FOLDER}`);
    return;
  }

  console.log(`Converting ${docxFiles.length} file(s) from ${INPUT_FOLDER}`);

  // country code -> first source file that claimed it
  const taken = new Map<string, string>();

  for (const filePath of docxFiles) {
    const relative = path.relative(INPUT_FOLDER, filePath);
    const outputPath = resolveOutputPath(filePath, relative, taken);

    try {
      const markdown = await docxToMarkdown(filePath);

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, markdown, 'utf-8');

      console.log(
        `  ✓ ${relative} -> ${path.relative(process.cwd(), outputPath)}`,
      );
    } catch (error) {
      console.error(`  ✗ ${relative}: ${(error as Error).message}`);
      process.exitCode = 1;
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
