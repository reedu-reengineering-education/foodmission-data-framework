/**
 * Idempotent seed step: links Food and FoodCategory records to their best-matching
 * FoodShelfLife entry using 3-tier scoring:
 *   Tier 1: exact name match        (+10)
 *   Tier 2: keyword token overlap   (+N, one point per matching token)
 *   Tier 3: category alignment      (+2)
 *
 * Records that already have a shelfLifeId are skipped, making this safe to re-run.
 * Updates are batched by matched shelf-life id (one updateMany per distinct match).
 */

import { PrismaClient, FoodShelfLife } from '@prisma/client';

// ─── text helpers ────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'fresh',
  'raw',
  'organic',
  'whole',
  'the',
  'a',
  'an',
  'and',
  'or',
  'in',
  'of',
  'with',
  'from',
  'for',
  'to',
  'at',
  'by',
  'on',
  'as',
  'is',
  'it',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,()/-]+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

/** Strips language prefix and dashes from OpenFoodFacts category tags. */
function offTagToPlain(tag: string): string {
  return tag
    .replace(/^[a-z]{2}:/, '')
    .replace(/-/g, ' ')
    .toLowerCase();
}

// ─── scoring ─────────────────────────────────────────────────────────────────

export interface MatchCandidate {
  shelfLife: FoodShelfLife;
  score: number;
  reason: string;
}

export function scoreAgainst(
  name: string,
  categoryHints: string[],
  entry: FoodShelfLife,
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  if (entry.name.toLowerCase() === name.toLowerCase()) {
    score += 10;
    reasons.push('exact');
  }

  const nameTokens = new Set(tokenize(name));
  const entryTokens = new Set(
    entry.keywords.flatMap((k) => [k.toLowerCase(), ...tokenize(k)]),
  );
  let overlap = 0;
  for (const token of nameTokens) {
    if (entryTokens.has(token)) overlap++;
  }
  if (overlap > 0) {
    score += overlap;
    reasons.push(`kw(${overlap})`);
  }

  if (entry.categoryName && categoryHints.length > 0) {
    const ec = entry.categoryName.toLowerCase();
    const ecFirst = ec.split(' ')[0];
    const hit = categoryHints.some(
      (c) => c.includes(ecFirst) || ec.includes(c.split(' ')[0]),
    );
    if (hit) {
      score += 2;
      reasons.push('cat');
    }
  }

  return { score, reason: reasons.join('+') || 'none' };
}

export function findBestMatch(
  name: string,
  categoryHints: string[],
  entries: FoodShelfLife[],
  minScore = 1,
): MatchCandidate | null {
  let best: FoodShelfLife | null = null;
  let bestScore = 0;
  let bestReason = 'none';

  for (const entry of entries) {
    const { score, reason } = scoreAgainst(name, categoryHints, entry);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
      bestReason = reason;
    }
  }

  if (best && bestScore >= minScore) {
    return { shelfLife: best, score: bestScore, reason: bestReason };
  }
  return null;
}

// ─── link step ───────────────────────────────────────────────────────────────

export interface LinkShelfLifeResult {
  foods: number;
  categories: number;
}

export async function linkShelfLife(
  prisma: PrismaClient,
  minScore = 1,
): Promise<LinkShelfLifeResult> {
  const entries = await prisma.foodShelfLife.findMany();
  if (entries.length === 0) {
    console.log('   ⏭️  No FoodShelfLife entries found; skipping link step.');
    return { foods: 0, categories: 0 };
  }

  // ── Foods ─────────────────────────────────────────────────────────────────
  const foodIdsByShelfLife = new Map<string, string[]>();
  const foodTotal = await prisma.food.count();
  let foodSkipped = 0;

  for (let skip = 0; skip < foodTotal; skip += 500) {
    const batch = await prisma.food.findMany({
      select: { id: true, name: true, categories: true, shelfLifeId: true },
      skip,
      take: 500,
    });
    for (const food of batch) {
      if (food.shelfLifeId) {
        foodSkipped++;
        continue;
      }
      const hints = (food.categories ?? []).map(offTagToPlain);
      const match = findBestMatch(food.name, hints, entries, minScore);
      if (match) {
        const list = foodIdsByShelfLife.get(match.shelfLife.id) ?? [];
        list.push(food.id);
        foodIdsByShelfLife.set(match.shelfLife.id, list);
      }
    }
  }

  let foodLinked = 0;
  for (const [shelfLifeId, ids] of foodIdsByShelfLife) {
    const { count } = await prisma.food.updateMany({
      where: { id: { in: ids } },
      data: { shelfLifeId },
    });
    foodLinked += count;
  }

  // ── FoodCategories ────────────────────────────────────────────────────────
  const catIdsByShelfLife = new Map<string, string[]>();
  const catTotal = await prisma.foodCategory.count();
  let catSkipped = 0;

  for (let skip = 0; skip < catTotal; skip += 500) {
    const batch = await prisma.foodCategory.findMany({
      select: { id: true, foodName: true, foodGroup: true, shelfLifeId: true },
      skip,
      take: 500,
    });
    for (const cat of batch) {
      if (cat.shelfLifeId) {
        catSkipped++;
        continue;
      }
      const hints = [cat.foodGroup.toLowerCase()];
      const match = findBestMatch(cat.foodName, hints, entries, minScore);
      if (match) {
        const list = catIdsByShelfLife.get(match.shelfLife.id) ?? [];
        list.push(cat.id);
        catIdsByShelfLife.set(match.shelfLife.id, list);
      }
    }
  }

  let catLinked = 0;
  for (const [shelfLifeId, ids] of catIdsByShelfLife) {
    const { count } = await prisma.foodCategory.updateMany({
      where: { id: { in: ids } },
      data: { shelfLifeId },
    });
    catLinked += count;
  }

  if (foodSkipped > 0 || catSkipped > 0) {
    console.log(
      `   ↩️  Skipped already-linked: ${foodSkipped} foods, ${catSkipped} food categories`,
    );
  }

  return { foods: foodLinked, categories: catLinked };
}
