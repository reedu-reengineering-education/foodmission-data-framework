import {
  NutritionalInfo,
  OpenFoodFactsNutriments,
} from '../interfaces/openfoodfacts.interface';

/** NutritionalInfo field → OFF nutrient id. */
const NUTRIENT_IDS: Record<keyof NutritionalInfo, string> = {
  energyKcal: 'energy-kcal',
  energyKj: 'energy-kj',
  fat: 'fat',
  saturatedFat: 'saturated-fat',
  transFat: 'trans-fat',
  cholesterol: 'cholesterol',
  carbohydrates: 'carbohydrates',
  sugars: 'sugars',
  fiber: 'fiber',
  proteins: 'proteins',
  salt: 'salt',
  sodium: 'sodium',
  vitaminA: 'vitamin-a',
  vitaminC: 'vitamin-c',
  calcium: 'calcium',
  iron: 'iron',
};

/** Factor to grams, the unit legacy `<id>_100g` values use. */
const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  mg: 1e-3,
  µg: 1e-6,
  μg: 1e-6,
  mcg: 1e-6,
};

/**
 * Per-100 g/ml nutrition from an Open Food Facts product document.
 *
 * OFF schema 1003+ (2025 nutrition rework) stores values under
 * `nutrition.aggregated_set.nutrients.<id>.value` and leaves `nutriments`
 * empty; the live API only fills `nutriments` for older api versions. The
 * local Mongo clone holds the stored form, so both shapes are read here.
 * Values OFF only estimated from ingredients are skipped, as legacy
 * `nutriments` kept those apart (`nutriments_estimated`).
 */
export function extractOffNutrition(
  product: Record<string, unknown>,
): NutritionalInfo | undefined {
  const legacy = fromLegacyNutriments(
    product.nutriments as OpenFoodFactsNutriments | undefined,
  );
  const aggregated = fromAggregatedSet(product.nutrition);
  if (!legacy && !aggregated) return undefined;

  const result: NutritionalInfo = {};
  for (const field of Object.keys(NUTRIENT_IDS) as (keyof NutritionalInfo)[]) {
    const value = legacy?.[field] ?? aggregated?.[field];
    if (value !== undefined) result[field] = value;
  }
  return result;
}

/** `per` of the aggregated set, e.g. "100g", "100ml" or "serving". */
export function extractOffNutritionPer(
  product: Record<string, unknown>,
): string | undefined {
  const set = aggregatedSet(product.nutrition);
  return typeof set?.per === 'string' ? set.per : undefined;
}

function fromLegacyNutriments(
  nutriments?: OpenFoodFactsNutriments,
): NutritionalInfo | undefined {
  if (!nutriments || typeof nutriments !== 'object') return undefined;
  const raw = nutriments as Record<string, unknown>;
  const result: NutritionalInfo = {};
  let found = false;
  for (const [field, id] of Object.entries(NUTRIENT_IDS)) {
    const value = toNumber(raw[`${id}_100g`]) ?? toNumber(raw[id]);
    if (value !== undefined) {
      result[field as keyof NutritionalInfo] = value;
      found = true;
    }
  }
  return found ? result : undefined;
}

function fromAggregatedSet(nutrition: unknown): NutritionalInfo | undefined {
  const set = aggregatedSet(nutrition);
  if (!set) return undefined;
  // Only per-100 g/ml values match NutritionalInfo's basis.
  if (typeof set.per === 'string' && !set.per.startsWith('100')) {
    return undefined;
  }
  const nutrients = set.nutrients;
  if (!nutrients || typeof nutrients !== 'object') return undefined;

  const result: NutritionalInfo = {};
  let found = false;
  for (const [field, id] of Object.entries(NUTRIENT_IDS)) {
    const entry = (nutrients as Record<string, unknown>)[id];
    if (!entry || typeof entry !== 'object') continue;
    const { value, unit, source } = entry as Record<string, unknown>;
    if (source === 'estimate') continue;
    let num = toNumber(value);
    if (num === undefined) continue;
    if (typeof unit === 'string' && UNIT_TO_GRAMS[unit] !== undefined) {
      num *= UNIT_TO_GRAMS[unit];
    }
    result[field as keyof NutritionalInfo] = num;
    found = true;
  }
  return found ? result : undefined;
}

function aggregatedSet(
  nutrition: unknown,
): Record<string, unknown> | undefined {
  if (!nutrition || typeof nutrition !== 'object') return undefined;
  const set = (nutrition as Record<string, unknown>).aggregated_set;
  return set && typeof set === 'object'
    ? (set as Record<string, unknown>)
    : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}
