/**
 * Pure resolution logic for FoodEx2 → NEVO.
 *
 * Two steps, both deterministic and side-effect free so the importer, the
 * services and the tests all agree on the outcome:
 *
 *   1. roll a NEVO record's FoodEx2 code up the MTX hierarchy to a *concept*
 *      (a core term, or an M/P grouping when no core ancestor exists);
 *   2. score every NEVO record filed under a concept and elect one canonical
 *      record. Values are never averaged across records — a concept always
 *      points at exactly one NEVO item.
 */
import {
  FOODEX2_CANONICAL_CONFIG,
  Foodex2CanonicalConfig,
} from './foodex2-canonical.config';

/** Minimal shape of a FoodEx2 term needed to walk the hierarchy. */
export interface Foodex2HierarchyNode {
  code: string;
  detailLevel: string;
  parentCode: string | null;
}

/** A NEVO record competing to represent a FoodEx2 concept. */
export interface NevoCandidate {
  nevoCode: number;
  foodName: string;
  /** FoodEx2 base code published on the NEVO record. */
  sourceFoodex2Code: string;
  /** Hierarchy steps from `sourceFoodex2Code` to the concept (0 = direct hit). */
  hierarchyDepth: number;
}

export interface ScoredNevoCandidate extends NevoCandidate {
  priority: number;
  selectionReason: string;
}

export interface ConceptResolution {
  conceptCode: string;
  hierarchyDepth: number;
  /** `core` for a core-list hit, `fallback` when an M/P grouping was used. */
  via: 'core' | 'fallback';
}

/** A base FoodEx2 term code, e.g. `A007L`. Facets look like `F28.A07HS`. */
const BASE_CODE_PATTERN = /^[A-Z][A-Z0-9]{4}$/;

/**
 * Picks the base term out of the FoodEx2 codes stored on a NEVO record.
 *
 * NEVO publishes full FoodEx2 expressions such as `A00ZX#F28.A07HS`, which the
 * NEVO importer splits into `["A00ZX", "F28.A07HS"]`. Only the leading base
 * term names the food; the rest are facet descriptors.
 */
export function parseFoodex2BaseCode(codes: readonly string[]): string | null {
  const first = codes
    .find((code) => code.trim() !== '')
    ?.trim()
    .toUpperCase();
  return first && BASE_CODE_PATTERN.test(first) ? first : null;
}

/**
 * Walks up the MTX hierarchy until a term at a concept detail level is found.
 *
 * Returns `null` when the code is unknown or has no usable ancestor, so the
 * importer can report it rather than silently dropping the NEVO record.
 */
export function resolveConceptCode(
  baseCode: string,
  nodes: ReadonlyMap<string, Foodex2HierarchyNode>,
  config: Foodex2CanonicalConfig = FOODEX2_CANONICAL_CONFIG,
): ConceptResolution | null {
  const chain: Foodex2HierarchyNode[] = [];
  const seen = new Set<string>();

  let current = nodes.get(baseCode);
  while (current && !seen.has(current.code)) {
    seen.add(current.code);
    chain.push(current);
    if (chain.length >= config.maxHierarchyDepth) break;
    current = current.parentCode ? nodes.get(current.parentCode) : undefined;
  }

  const findAt = (
    levels: readonly string[],
    via: ConceptResolution['via'],
  ): ConceptResolution | null => {
    const index = chain.findIndex((node) => levels.includes(node.detailLevel));
    return index === -1
      ? null
      : { conceptCode: chain[index].code, hierarchyDepth: index, via };
  };

  return (
    findAt(config.conceptDetailLevels, 'core') ??
    findAt(config.fallbackConceptDetailLevels, 'fallback')
  );
}

/**
 * Scores one NEVO record as a representative of its FoodEx2 concept.
 *
 * Higher is better. The reason string is stored alongside the score so a data
 * steward can see why a record won without re-running the algorithm.
 */
export function scoreNevoCandidate(
  candidate: NevoCandidate,
  config: Foodex2CanonicalConfig = FOODEX2_CANONICAL_CONFIG,
): ScoredNevoCandidate {
  const name = candidate.foodName.toLowerCase();
  const reasons: string[] = [];

  const matched = config.preparationRules.filter((rule) =>
    rule.pattern.test(name),
  );
  // A name may carry several states ("raw" + "boiled"); the most processed one
  // describes the record, so take the lowest score among the rules that
  // actually matched. The neutral score applies only when none did — it must
  // not take part in the minimum, or it would cap raw and unprepared.
  const preparation: { id: string; score: number } =
    matched.length === 0
      ? { id: 'unspecified', score: config.neutralPreparationScore }
      : matched.reduce((lowest, rule) =>
          rule.score < lowest.score ? rule : lowest,
        );
  reasons.push(`prep:${preparation.id}=${preparation.score}`);

  let score = preparation.score;
  for (const rule of config.modifierRules) {
    if (!rule.pattern.test(name)) continue;
    score += rule.delta;
    reasons.push(`${rule.id}=${rule.delta}`);
  }

  const depthPenalty = config.hierarchyDepthPenalty * candidate.hierarchyDepth;
  score += depthPenalty;
  reasons.push(`depth${candidate.hierarchyDepth}=${depthPenalty}`);

  const lengthPenalty = config.nameLengthPenalty * candidate.foodName.length;
  score += lengthPenalty;
  reasons.push(`length=${lengthPenalty}`);

  return {
    ...candidate,
    // Stored as an integer; scaling keeps the half-point length penalty intact.
    priority: Math.round(score * 2),
    selectionReason: reasons.join(' '),
  };
}

/**
 * Orders candidates best-first: highest score, then lowest NEVO code.
 *
 * The NEVO-code tiebreak is what makes the election deterministic — 29 of the
 * 619 concepts in NEVO 2025 have candidates that score identically.
 */
export function rankNevoCandidates(
  candidates: readonly ScoredNevoCandidate[],
): ScoredNevoCandidate[] {
  return [...candidates].sort(
    (a, b) => b.priority - a.priority || a.nevoCode - b.nevoCode,
  );
}

export interface CanonicalSelection {
  canonical: ScoredNevoCandidate | null;
  ranked: ScoredNevoCandidate[];
  /** Candidates tied with the winner on score, before the NEVO-code tiebreak. */
  tiedCandidates: ScoredNevoCandidate[];
}

/** Elects exactly one canonical NEVO record for a concept. */
export function selectCanonicalNevo(
  candidates: readonly NevoCandidate[],
  config: Foodex2CanonicalConfig = FOODEX2_CANONICAL_CONFIG,
): CanonicalSelection {
  const ranked = rankNevoCandidates(
    candidates.map((candidate) => scoreNevoCandidate(candidate, config)),
  );
  const canonical = ranked[0] ?? null;

  return {
    canonical,
    ranked,
    tiedCandidates: canonical
      ? ranked.filter(
          (c) =>
            c.priority === canonical.priority &&
            c.nevoCode !== canonical.nevoCode,
        )
      : [],
  };
}
