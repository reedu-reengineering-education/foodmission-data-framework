/**
 * Relevance ranking for the generic-food search.
 *
 * Pure and side-effect free: the repository loads candidates with a plain
 * substring filter, and everything that decides *what* a user sees — match
 * quality, and which NEVO records fold into one result — happens here.
 *
 * The rule that shapes the result list: **collapse only into what the user
 * named.** A query that names a FoodEx2 food ("Nudeln", "Kartoffeln") gets one
 * row for that food instead of every NEVO variant behind it. A query that
 * names something more specific ("Lasagne", "Gulasch") gets the NEVO record
 * it names — never the canonical record of a broader category.
 */
import { FOODEX2_CANONICAL_CONFIG } from '../foodex2/foodex2-canonical.config';

/**
 * Match tiers, best first. A row's tier is the best one any of its names
 * reaches.
 */
export const MATCH_TIER = {
  /** The whole name is the query: "Gulasch", "Banane". */
  EXACT: 0,
  /**
   * The head is the query or starts with it as a word: "Kartoffeln, roh",
   * "Pizza Margherita". Deliberately one tier — "Hummus mit Gemüse" is no
   * better a match than "Hummus natur" just because its head is cut shorter.
   */
  LEADING_WORD: 1,
  /**
   * A word of the head is the query, or the head's last word ends with it.
   * The food is named last — in a German compound and in the phrase around
   * it — so "Vollmilch" and "Weißer Reis" are milk and rice, while
   * "Milchschokolade" and "Alkoholfreier Wein" are not.
   */
  WORD: 2,
  /** The head starts with the query inside a compound: "Milchschokolade". */
  PREFIX: 3,
  /** A later word of the head starts with the query. */
  WORD_PREFIX: 4,
  /** The query appears anywhere in the head. */
  SUBSTRING: 5,
  /**
   * A word after the head starts with the query — an ingredient the food
   * mentions ("Omelett mit Kartoffeln"), not the food itself.
   */
  MENTION: 6,
} as const;

/**
 * Added to a tier reached only through an English name while another locale
 * was requested, so every hit in the user's language ranks first.
 */
export const FALLBACK_TIER_OFFSET = 10;

/** Words that introduce an ingredient instead of naming the food. */
const MODIFIER_WORDS = new Set([
  'mit',
  'met',
  'with',
  'w',
  'wo',
  'without',
  'und',
  'and',
  'en',
  'in',
  'im',
  'auf',
  'aus',
  'für',
  'op',
  'ohne',
  'zonder',
  'from',
  'van',
  'con',
  'med',
]);

const WORD_SEPARATOR = /[\s\-/()"„“”«»–]+/;

/** A query split into the term as typed and the stem most tiers match on. */
export interface SearchQuery {
  term: string;
  stem: string;
}

/**
 * Normalizes a raw search string, or returns `null` when there is nothing to
 * search for.
 *
 * The stem drops a German plural `-n`, so *Frühlingsrollen* finds
 * "Frühlingsrolle" and *Kartoffeln* finds "Kartoffelpüree". It only ever
 * shortens the term, so a wrong guess widens the search instead of breaking
 * it. Short words are left alone — "Wein" must not become "Wei".
 */
export function parseSearchQuery(raw: string | undefined): SearchQuery | null {
  const term = raw?.trim().toLowerCase() ?? '';
  if (!term) return null;
  const stem =
    term.length >= 5 && /[aeiouäöülr]n$/.test(term) ? term.slice(0, -1) : term;
  return { term, stem };
}

function splitWords(value: string): string[] {
  return value.split(WORD_SEPARATOR).filter(Boolean);
}

/**
 * Splits a lowercased food name into its head — everything before the first
 * comma or modifier word — and the words after it.
 *
 * NEVO names are head-first ("Pasta white wo egg boiled", "Weiße Nudeln,
 * roh"), so the head is the food and the rest describes what was added.
 */
export function splitHead(name: string): { head: string; tail: string[] } {
  const [beforeComma, ...afterComma] = name.toLowerCase().split(',');
  const words = beforeComma.trim().split(/\s+/);
  const cut = words.findIndex(
    (word, index) => index > 0 && MODIFIER_WORDS.has(word),
  );
  const headWords = cut === -1 ? words : words.slice(0, cut);
  const tailWords = cut === -1 ? [] : words.slice(cut + 1);

  return {
    head: headWords.join(' '),
    tail: [...tailWords, ...splitWords(afterComma.join(' '))],
  };
}

/** The tier one name reaches for a query, or `null` when it does not match. */
export function matchTier(name: string, query: SearchQuery): number | null {
  const { term, stem } = query;
  const { head, tail } = splitHead(name);
  const words = splitWords(head);
  const isQuery = (word: string) => word === term || word === stem;

  const fullName = name.trim().toLowerCase();
  if (fullName === term || fullName === stem) return MATCH_TIER.EXACT;
  if (
    head === term ||
    head === stem ||
    head.startsWith(`${term} `) ||
    (words.length > 0 && isQuery(words[0]))
  ) {
    return MATCH_TIER.LEADING_WORD;
  }
  // A two-letter stem such as "ei" ends far too many words to be a compound
  // head ("Brei"); it still matches further down as a substring.
  const lastWord = words[words.length - 1] ?? '';
  if (words.some(isQuery) || (stem.length >= 3 && lastWord.endsWith(stem))) {
    return MATCH_TIER.WORD;
  }
  if (head.startsWith(stem)) return MATCH_TIER.PREFIX;
  if (words.some((w) => w.startsWith(stem))) return MATCH_TIER.WORD_PREFIX;
  if (
    stem.length >= 3 ? head.includes(stem) : words.some((w) => w.endsWith(stem))
  ) {
    return MATCH_TIER.SUBSTRING;
  }
  if (tail.some((w) => w.startsWith(stem))) return MATCH_TIER.MENTION;
  return null;
}

/**
 * Names to match, split by how they relate to the requested locale.
 *
 * `local` holds what the user sees — the translated name, or the English one
 * when no translation exists. `fallback` holds the English source names,
 * matched at a penalty so a German query ranks German hits first.
 */
export interface CandidateNames {
  local: readonly (string | null)[];
  fallback: readonly (string | null)[];
}

function bestTier(
  names: CandidateNames,
  query: SearchQuery,
  maxTier: number,
): number | null {
  const tiers = [
    ...names.local.map((name) => (name ? matchTier(name, query) : null)),
    ...names.fallback.map((name) => {
      const tier = name ? matchTier(name, query) : null;
      return tier === null ? null : tier + FALLBACK_TIER_OFFSET;
    }),
  ].filter(
    (tier): tier is number =>
      tier !== null && tier % FALLBACK_TIER_OFFSET <= maxTier,
  );
  return tiers.length > 0 ? Math.min(...tiers) : null;
}

/** A NEVO record that passed the repository's substring filter. */
export interface RecordCandidate {
  nevoCode: number;
  /** Name shown to the user; used for ordering. */
  displayName: string;
  names: CandidateNames;
  /** FoodEx2 concept the record is filed under, if it has one. */
  conceptCode: string | null;
  conceptTermType: string | null;
  /** FoodEx2 code published on the NEVO record, before the roll-up. */
  sourceCode: string | null;
  /** Canonical-election score: higher means a plainer, more generic record. */
  priority: number | null;
}

/** A FoodEx2 concept that passed the repository's substring filter. */
export interface ConceptCandidate {
  code: string;
  termType: string;
  displayName: string;
  names: CandidateNames;
  canonicalNevoCode: number;
  /** Name of the canonical record, localized like `displayName`. */
  canonicalName: string;
  priority: number;
  /** NEVO records filed under the concept. */
  recordCount: number;
}

/** One row of the result list. */
export interface FoodSearchHit {
  /** NEVO record whose values the row carries. */
  nevoCode: number;
  /** Set when the row stands for a FoodEx2 concept the query named. */
  concept: { code: string; displayName: string } | null;
  /**
   * FoodEx2 code the row collapses — `?foodex2Code=` lists what is filed
   * under it. `null` when the row is a single record that was not collapsed.
   */
  groupCode: string | null;
  tier: number;
}

interface RankedHit extends FoodSearchHit {
  /** Records behind a concept row; 0 for a record row. */
  recordCount: number;
  priority: number;
  displayName: string;
}

function compareHits(a: RankedHit, b: RankedHit): number {
  return (
    a.tier - b.tier ||
    // On a tie the named concept beats the single record.
    Number(b.concept !== null) - Number(a.concept !== null) ||
    // Between concepts, the one NEVO covers with more records is the more
    // common food: *Kuhmilch* before *Muttermilch*.
    b.recordCount - a.recordCount ||
    b.priority - a.priority ||
    a.displayName.length - b.displayName.length ||
    a.displayName.localeCompare(b.displayName) ||
    a.nevoCode - b.nevoCode
  );
}

/**
 * FoodEx2 code a matching record folds into when its concept was not named.
 *
 * Records filed under an extended term ("Beef minced") fold into that term,
 * and records filed directly under a plain concept fold into the concept,
 * shown under the best-matching record's name. Records of a dish category
 * never fold, not even under an extended term: "Lasagne Bolognese" and
 * "Lasagne mit Gemüse" are two dishes, not variants of one food.
 */
function recordGroupCode(
  record: RecordCandidate,
  nonCollapsibleTermTypes: readonly string[],
): string | null {
  if (!record.conceptCode || !record.sourceCode) return null;
  if (
    record.conceptTermType &&
    nonCollapsibleTermTypes.includes(record.conceptTermType)
  ) {
    return null;
  }
  return record.sourceCode;
}

export interface RankFoodSearchOptions {
  /** `false` lists every matching record, as a drill-down into one code does. */
  collapse: boolean;
  nonCollapsibleTermTypes?: readonly string[];
}

/**
 * Ranks and collapses search candidates into the final, fully ordered result
 * list. With no query every record matches at the top tier, so a drill-down
 * lists its records by how generic they are.
 */
export function rankFoodSearch(
  records: readonly RecordCandidate[],
  concepts: readonly ConceptCandidate[],
  query: SearchQuery | null,
  options: RankFoodSearchOptions,
): FoodSearchHit[] {
  const nonCollapsible =
    options.nonCollapsibleTermTypes ??
    FOODEX2_CANONICAL_CONFIG.nonCollapsibleTermTypes;

  // 1. Concepts the query names. A mention is not naming, so it never counts.
  const conceptHits: RankedHit[] = [];
  if (options.collapse && query) {
    for (const concept of concepts) {
      if (nonCollapsible.includes(concept.termType)) continue;
      const tier = bestTier(concept.names, query, MATCH_TIER.SUBSTRING);
      if (tier === null) continue;
      // A concept with a single record collapses nothing, and its name would
      // only hide what the record is: *Nudeln ungefüllt ungekocht* holds one
      // record, boiled pasta. Its name still finds the record, which then
      // answers under its own name.
      const collapses = concept.recordCount > 1;
      // Such a row ranks by the name it shows, when that name matches at all.
      const ownTier = collapses
        ? null
        : matchTier(concept.canonicalName, query);
      conceptHits.push({
        nevoCode: concept.canonicalNevoCode,
        concept: collapses
          ? { code: concept.code, displayName: concept.displayName }
          : null,
        groupCode: concept.code,
        tier:
          ownTier !== null && ownTier <= MATCH_TIER.SUBSTRING ? ownTier : tier,
        recordCount: collapses ? concept.recordCount : 0,
        priority: concept.priority,
        displayName: collapses ? concept.displayName : concept.canonicalName,
      });
    }
  }
  const namedConcepts = new Map(conceptHits.map((hit) => [hit.groupCode, hit]));
  const standsFor = (record: RecordCandidate) =>
    record.conceptCode ? namedConcepts.get(record.conceptCode) : undefined;

  const matched = records.flatMap((record) => {
    const tier = query ? bestTier(record.names, query, MATCH_TIER.MENTION) : 0;
    return tier === null ? [] : [{ record, tier }];
  });

  // A record whose whole name is the query was named more precisely than any
  // concept around it: "Banane" must answer "Banane", not the plantain that
  // represents *Bananen und ähnliche*.
  for (const { record, tier } of matched) {
    const namedConcept = standsFor(record);
    if (tier === MATCH_TIER.EXACT && namedConcept && namedConcept.tier > tier) {
      namedConcepts.delete(record.conceptCode);
    }
  }

  // 2. Records, minus those a named concept already stands for. Records that
  //    fold into the same code keep only the best-ranked one.
  const recordHits: RankedHit[] = [];
  const byGroup = new Map<string, RankedHit>();
  for (const { record, tier } of matched) {
    const namedConcept = standsFor(record);
    if (namedConcept) {
      // The concept row stands for this record, so it ranks as well as its
      // best match: "Hähnchen" names *Frisches Hähnchenfleisch* only inside a
      // compound, but "Hähnchen, roh" behind it is an exact hit.
      namedConcept.tier = Math.min(namedConcept.tier, tier);
      continue;
    }

    const groupCode = options.collapse
      ? recordGroupCode(record, nonCollapsible)
      : null;
    const hit: RankedHit = {
      nevoCode: record.nevoCode,
      concept: null,
      groupCode,
      tier,
      recordCount: 0,
      priority: record.priority ?? Number.NEGATIVE_INFINITY,
      displayName: record.displayName,
    };

    if (!groupCode) {
      recordHits.push(hit);
      continue;
    }
    const current = byGroup.get(groupCode);
    if (!current || compareHits(hit, current) < 0) byGroup.set(groupCode, hit);
  }

  return [...namedConcepts.values(), ...recordHits, ...byGroup.values()]
    .sort(compareHits)
    .map(({ nevoCode, concept, groupCode, tier }) => ({
      nevoCode,
      concept,
      groupCode,
      tier,
    }));
}
