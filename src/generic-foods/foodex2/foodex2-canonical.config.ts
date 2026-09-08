/**
 * Configuration for mapping FoodEx2 concepts onto canonical NEVO items.
 *
 * Everything that decides *which* NEVO record represents a FoodEx2 food lives
 * here rather than in service code, so the mapping can be retuned without
 * touching the resolution algorithm. The rules are pure data and the resulting
 * score is stored on `Foodex2NevoMapping.priority`, which keeps every canonical
 * choice reproducible and explainable.
 */

/** MTX `detailLevel` codes, as published in the EFSA catalogue. */
export const FOODEX2_DETAIL_LEVEL = {
  /** Core list — the vocabulary we want users to search. */
  CORE: 'C',
  /** Extended term — a more detailed child of a core term. */
  EXTENDED: 'E',
  /** Hierarchy term — structural grouping, not reportable as a food. */
  HIERARCHY: 'H',
  /** Facet descriptor — describes a property, never a food on its own. */
  FACET: 'F',
  /** Intermediate groupings that sit between core and hierarchy terms. */
  MIXED: 'M',
  PARENT: 'P',
} as const;

/** A single preparation-state rule. First match with the *lowest* score wins. */
export interface PreparationRule {
  id: string;
  pattern: RegExp;
  score: number;
}

/** A modifier applied on top of the preparation score. */
export interface ModifierRule {
  id: string;
  pattern: RegExp;
  delta: number;
}

export interface Foodex2CanonicalConfig {
  /**
   * Detail levels a NEVO item may be exposed under. A NEVO record pointing at
   * an extended term is rolled up the MTX hierarchy until one of these is hit.
   */
  conceptDetailLevels: readonly string[];
  /**
   * Used only when no `conceptDetailLevels` ancestor exists at all. Without
   * this, ~64 NEVO concepts ("Dried herbs", "Smoked fish", …) would be
   * unreachable because EFSA files them under M/P groupings rather than a core
   * term.
   */
  fallbackConceptDetailLevels: readonly string[];
  /** Guards against cycles or pathological depth in the hierarchy walk. */
  maxHierarchyDepth: number;
  /** Documented intent of the vocabulary; see `preparationRules`. */
  preparationPreference: string;
  preparationRules: readonly PreparationRule[];
  /** Score for a NEVO name that names no preparation state at all. */
  neutralPreparationScore: number;
  modifierRules: readonly ModifierRule[];
  /**
   * Root of the composite (recipe-based) branch of the MTX hierarchy: dishes,
   * bakery wares, imitates — foods defined by a recipe rather than by what
   * they are. A concept below it names a dish, so the ingredients its NEVO
   * records mention are not the food itself.
   */
  compositeFoodRootCode: string;
  /** Penalty per hierarchy step between the NEVO term and the concept. */
  hierarchyDepthPenalty: number;
  /** Penalty per character of the NEVO name; longer names are more specific. */
  nameLengthPenalty: number;
}

/**
 * Default rules.
 *
 * GenericFood is consumed by pantry items, shopping-list items, recipe
 * ingredients and food waste — all ingredient-shaped rather than
 * plate-shaped — so the vocabulary represents foods **as bought / as stored**
 * and raw or unprepared variants are preferred. Flip `preparationRules` if the
 * product ever becomes as-consumed oriented; nothing else has to change.
 */
export const FOODEX2_CANONICAL_CONFIG: Foodex2CanonicalConfig = {
  conceptDetailLevels: [FOODEX2_DETAIL_LEVEL.CORE],
  fallbackConceptDetailLevels: [
    FOODEX2_DETAIL_LEVEL.MIXED,
    FOODEX2_DETAIL_LEVEL.PARENT,
  ],
  maxHierarchyDepth: 12,
  preparationPreference: 'raw',
  preparationRules: [
    // `raw milk` is a milk type, not a preparation state, so it must not
    // promote e.g. "Cheese raw milk 48+" over a plain cheese entry.
    { id: 'raw', pattern: /\braw\b(?!\s+milk)/, score: 100 },
    { id: 'unprepared', pattern: /\bunprepared\b/, score: 90 },
    { id: 'dried', pattern: /\bdried\b/, score: 55 },
    { id: 'boiled', pattern: /\bboiled\b/, score: 40 },
    { id: 'cooked', pattern: /\bcooked\b/, score: 40 },
    { id: 'prepared', pattern: /\bprepared\b/, score: 35 },
    { id: 'steamed', pattern: /\bsteamed\b/, score: 30 },
    { id: 'stewed', pattern: /\bstewed\b/, score: 25 },
    { id: 'baked', pattern: /\bbaked\b/, score: 20 },
    { id: 'grilled', pattern: /\bgrilled\b/, score: 20 },
    { id: 'roasted', pattern: /\broasted\b/, score: 20 },
    { id: 'fried', pattern: /\bfried\b/, score: 20 },
    { id: 'deep-fried', pattern: /\bdeep-fried\b/, score: 15 },
  ],
  neutralPreparationScore: 60,
  modifierRules: [
    // NEVO publishes its own generic averages ("Beef av raw"); those are
    // exactly the generic entry a FoodEx2 concept wants.
    { id: 'nevo-average', pattern: /\b(av|average)\b/, delta: 30 },
    // Fortified and branded/compound entries are the least representative.
    { id: 'fortified', pattern: /\bfortified\b/, delta: -40 },
    { id: 'specific-variant', pattern: /\bprod\b|\bw\b|\//, delta: -25 },
    // A record that names what was added to it describes one recipe, not the
    // concept: "Foe jung hai filled omelet wo rice" is a poor stand-in for
    // *Egg based dishes* next to "Omelette/scrambled eggs".
    {
      id: 'compound',
      pattern: /\b(spiced|filled|stuffed|breaded|flavou?red|coated|seasoned)\b/,
      delta: -25,
    },
  ],
  compositeFoodRootCode: 'A0BAG',
  hierarchyDepthPenalty: -15,
  nameLengthPenalty: -0.5,
};
