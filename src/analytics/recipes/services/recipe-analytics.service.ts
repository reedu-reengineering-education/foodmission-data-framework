import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RecipeAnalyticsQueryDto } from '../dto/recipe-analytics-query.dto';
import { RecipeAnalyticsRepository } from '../repositories/recipe-analytics.repository';

const DIET_LABELS = [
  'vegan',
  'vegetarian',
  'pescatarian',
  'meat-based',
  'gluten-free',
  'lactose-free',
  'low-carb',
  'high-protein',
  'keto',
] as const;

type DietLabel = (typeof DIET_LABELS)[number];

type RecipeAnalyticsRow = Awaited<
  ReturnType<RecipeAnalyticsRepository['findRecipes']>
>[number];

interface RecipeScore {
  recipeId: string;
  title: string;
  cookCount: number;
  viewCount: number;
  savedCount: number;
  trendScore: number;
  rating: number;
  ratingCount: number;
}

@Injectable()
export class RecipeAnalyticsService {
  constructor(private readonly repository: RecipeAnalyticsRepository) {}

  async getSummary(query: RecipeAnalyticsQueryDto) {
    const { from, to, fromRaw, toRaw } = this.parseRange(query);
    const recipes = await this.repository.findRecipes(from, to);
    const scored = recipes.map((recipe) => this.scoreRecipe(recipe));

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const totalRecipes = recipes.length;
    const activeRecipes = recipes.filter((r) => r.isPublic).length;
    const archivedRecipes = totalRecipes - activeRecipes;
    const avgRating = this.round2(
      this.avg(recipes.map((r) => r.rating).filter((v) => v > 0)),
    );

    return {
      period: {
        from: fromRaw,
        to: toRaw,
      },
      totalRecipes,
      newRecipes7d: recipes.filter((r) => r.createdAt >= sevenDaysAgo).length,
      newRecipes30d: recipes.filter((r) => r.createdAt >= thirtyDaysAgo).length,
      activeRecipes,
      archivedRecipes,
      avgRating,
      mostViewedRecipes: scored
        .slice()
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 10)
        .map((r) => ({ title: r.title, viewCount: r.viewCount })),
      mostCookedRecipes: scored
        .slice()
        .sort((a, b) => b.cookCount - a.cookCount)
        .slice(0, 10)
        .map((r) => ({ title: r.title, cookCount: r.cookCount })),
      mostSavedRecipes: scored
        .slice()
        .sort((a, b) => b.savedCount - a.savedCount)
        .slice(0, 10)
        .map((r) => ({ title: r.title, savedCount: r.savedCount })),
      highestRatedRecipes: scored
        .filter((r) => r.ratingCount > 0)
        .sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount)
        .slice(0, 10)
        .map((r) => ({
          title: r.title,
          rating: this.round2(r.rating),
          ratingCount: r.ratingCount,
        })),
      trendingRecipes: scored
        .slice()
        .sort((a, b) => b.trendScore - a.trendScore)
        .slice(0, 10)
        .map((r) => ({ title: r.title, trendScore: this.round2(r.trendScore) })),
    };
  }

  async getDietTrend(query: RecipeAnalyticsQueryDto) {
    const { from, to } = this.parseRange(query);
    const recipes = await this.repository.findRecipes(from, to);
    const byDate = this.groupBy(
      recipes,
      (r) => r.createdAt.toISOString().slice(0, 10),
    );

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rows]) => {
        const total = rows.length;

        return {
          date,
          recipeCount: total,
          veganPct: this.pct(rows, 'vegan'),
          vegetarianPct: this.pct(rows, 'vegetarian'),
          pescatarianPct: this.pct(rows, 'pescatarian'),
          meatBasedPct: this.pct(rows, 'meat-based'),
          glutenFreePct: this.pct(rows, 'gluten-free'),
          lactoseFreePct: this.pct(rows, 'lactose-free'),
          lowCarbPct: this.pct(rows, 'low-carb'),
          highProteinPct: this.pct(rows, 'high-protein'),
          ketoPct: this.pct(rows, 'keto'),
        };
      });
  }

  async getDietDistribution(query: RecipeAnalyticsQueryDto) {
    const { from, to } = this.parseRange(query);
    const recipes = await this.repository.findRecipes(from, to);

    return {
      totalRecipes: recipes.length,
      labels: DIET_LABELS.map((label) => {
        const count = recipes.filter((r) => r.dietaryLabels.includes(label)).length;
        return {
          label,
          count,
          pct:
            recipes.length === 0
              ? 0
              : this.round2((count / recipes.length) * 100),
        };
      }),
    };
  }

  async getNutrition(query: RecipeAnalyticsQueryDto) {
    const { from, to } = this.parseRange(query);
    const recipes = await this.repository.findRecipes(from, to);
    const byDate = this.groupBy(
      recipes,
      (r) => r.createdAt.toISOString().slice(0, 10),
    );

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rows]) => {
        const nutrition = rows.map((r) => this.getNutritionInfo(r.nutritionalInfo));
        return {
          date,
          recipeCount: rows.length,
          avgCalories: this.round2(this.avg(nutrition.map((n) => n.calories))),
          avgProtein: this.round2(this.avg(nutrition.map((n) => n.protein))),
          avgCarbs: this.round2(this.avg(nutrition.map((n) => n.carbs))),
          avgFat: this.round2(this.avg(nutrition.map((n) => n.fat))),
          avgFiber: this.round2(this.avg(nutrition.map((n) => n.fiber))),
          avgSugar: this.round2(this.avg(nutrition.map((n) => n.sugar))),
          avgSalt: this.round2(this.avg(nutrition.map((n) => n.salt))),
        };
      });
  }

  async getSustainability(query: RecipeAnalyticsQueryDto) {
    const { from, to } = this.parseRange(query);
    const recipes = await this.repository.findRecipes(from, to);
    const byDate = this.groupBy(
      recipes,
      (r) => r.createdAt.toISOString().slice(0, 10),
    );

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rows]) => {
        const sustainability = rows.map((r) =>
          this.getSustainabilityInfo(r.nutritionalInfo, r.sustainabilityScore),
        );

        return {
          date,
          recipeCount: rows.length,
          avgEcoScore: this.round2(this.avg(sustainability.map((s) => s.ecoScore))),
          avgSustainabilityScore: this.round2(
            this.avg(sustainability.map((s) => s.sustainabilityScore)),
          ),
          avgCo2Footprint: this.round2(
            this.avg(sustainability.map((s) => s.co2Footprint)),
          ),
          avgWaterFootprint: this.round2(
            this.avg(sustainability.map((s) => s.waterFootprint)),
          ),
          avgSeasonalSharePct: this.round2(
            this.avg(sustainability.map((s) => s.seasonalSharePct)),
          ),
          avgLocalSharePct: this.round2(
            this.avg(sustainability.map((s) => s.localSharePct)),
          ),
        };
      });
  }

  async getTopIngredients(query: RecipeAnalyticsQueryDto) {
    const { from, to } = this.parseRange(query);
    const recipes = await this.repository.findRecipes(from, to);

    const usage = new Map<
      string,
      { ingredientName: string; usageCount: number; recipes: Set<string> }
    >();

    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const ingredientName = ingredient.name.trim();
        if (!ingredientName) continue;
        const key = ingredientName.toLowerCase();

        const current = usage.get(key) ?? {
          ingredientName,
          usageCount: 0,
          recipes: new Set<string>(),
        };

        current.usageCount += 1;
        current.recipes.add(recipe.id);
        usage.set(key, current);
      }
    }

    return [...usage.values()]
      .map((item) => ({
        ingredientName: item.ingredientName,
        usageCount: item.usageCount,
        recipeCount: item.recipes.size,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 50);
  }

  async getIngredientCategories(query: RecipeAnalyticsQueryDto) {
    const { from, to } = this.parseRange(query);
    const recipes = await this.repository.findRecipes(from, to);

    const categories = new Map<
      string,
      { category: string; usageCount: number; recipes: Set<string> }
    >();

    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const category = this.categorizeIngredient(ingredient.name);
        const current = categories.get(category) ?? {
          category,
          usageCount: 0,
          recipes: new Set<string>(),
        };

        current.usageCount += 1;
        current.recipes.add(recipe.id);
        categories.set(category, current);
      }
    }

    return [...categories.values()]
      .map((row) => ({
        category: row.category,
        usageCount: row.usageCount,
        recipeCount: row.recipes.size,
      }))
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  async getDiversity(query: RecipeAnalyticsQueryDto) {
    const { from, to } = this.parseRange(query);
    const recipes = await this.repository.findRecipes(from, to);

    const ingredientCounts = new Map<string, number>();
    const cuisineCounts = new Map<string, number>();
    const dietCounts = new Map<string, number>();

    let ingredientTotal = 0;

    for (const recipe of recipes) {
      const cuisine = (recipe.cuisineType ?? 'unknown').trim() || 'unknown';
      cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) ?? 0) + 1);

      for (const label of recipe.dietaryLabels) {
        dietCounts.set(label, (dietCounts.get(label) ?? 0) + 1);
      }

      for (const ingredient of recipe.ingredients) {
        const name = ingredient.name.trim().toLowerCase();
        if (!name) continue;
        ingredientTotal += 1;
        ingredientCounts.set(name, (ingredientCounts.get(name) ?? 0) + 1);
      }
    }

    return {
      recipeCount: recipes.length,
      uniqueIngredientCount: ingredientCounts.size,
      uniqueCuisineCount: cuisineCounts.size,
      uniqueDietLabelCount: dietCounts.size,
      avgIngredientsPerRecipe:
        recipes.length === 0
          ? 0
          : this.round2(ingredientTotal / recipes.length),
      ingredientDiversityIndex: this.round2(this.shannonIndex(ingredientCounts)),
      cuisineDiversityIndex: this.round2(this.shannonIndex(cuisineCounts)),
      dietLabelDiversityIndex: this.round2(this.shannonIndex(dietCounts)),
    };
  }

  async getCuisineTrends(query: RecipeAnalyticsQueryDto) {
    const { from, to } = this.parseRange(query);
    const recipes = await this.repository.findRecipes(from, to);

    if (recipes.length === 0) {
      return [];
    }

    const timestamps = recipes.map((r) => r.createdAt.getTime());
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const midpoint = new Date(minTs + (maxTs - minTs) / 2);

    const byCuisine = new Map<
      string,
      {
        cuisine: string;
        recipeCount: number;
        firstHalfCount: number;
        secondHalfCount: number;
        savedCount: number;
        cookCount: number;
        viewCount: number;
      }
    >();

    for (const recipe of recipes) {
      const cuisine = (recipe.cuisineType ?? 'unknown').trim() || 'unknown';
      const scored = this.scoreRecipe(recipe);

      const current = byCuisine.get(cuisine) ?? {
        cuisine,
        recipeCount: 0,
        firstHalfCount: 0,
        secondHalfCount: 0,
        savedCount: 0,
        cookCount: 0,
        viewCount: 0,
      };

      current.recipeCount += 1;
      if (recipe.createdAt <= midpoint) {
        current.firstHalfCount += 1;
      } else {
        current.secondHalfCount += 1;
      }
      current.savedCount += scored.savedCount;
      current.cookCount += scored.cookCount;
      current.viewCount += scored.viewCount;

      byCuisine.set(cuisine, current);
    }

    return [...byCuisine.values()]
      .map((row) => ({
        cuisine: row.cuisine,
        recipeCount: row.recipeCount,
        growthPct: this.round2(
          ((row.secondHalfCount - row.firstHalfCount) /
            Math.max(row.firstHalfCount, 1)) *
            100,
        ),
        savedCount: row.savedCount,
        cookCount: row.cookCount,
        viewCount: row.viewCount,
      }))
      .sort((a, b) => b.recipeCount - a.recipeCount);
  }

  async getCookingPatterns(query: RecipeAnalyticsQueryDto) {
    const { from, to } = this.parseRange(query);
    const recipes = await this.repository.findRecipes(from, to);

    const prepTimes = recipes
      .map((r) => r.prepTime)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const cookTimes = recipes
      .map((r) => r.cookTime)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

    const durationRows = recipes
      .map((r) => ({
        prepTime: r.prepTime ?? 0,
        cookTime: r.cookTime ?? 0,
      }))
      .filter((r) => r.prepTime > 0 || r.cookTime > 0)
      .map((r) => r.prepTime + r.cookTime);

    const quickCount = durationRows.filter((d) => d <= 30).length;
    const mediumCount = durationRows.filter((d) => d > 30 && d <= 60).length;
    const longCount = durationRows.filter((d) => d > 60).length;
    const totalCount = durationRows.length;

    return {
      recipeCount: recipes.length,
      avgPrepTime: this.round2(this.avg(prepTimes)),
      avgCookTime: this.round2(this.avg(cookTimes)),
      avgTotalTime: this.round2(this.avg(durationRows)),
      quickMealPct:
        totalCount === 0 ? 0 : this.round2((quickCount / totalCount) * 100),
      mediumMealPct:
        totalCount === 0 ? 0 : this.round2((mediumCount / totalCount) * 100),
      longMealPct:
        totalCount === 0 ? 0 : this.round2((longCount / totalCount) * 100),
      quickMealCount: quickCount,
      mediumMealCount: mediumCount,
      longMealCount: longCount,
    };
  }

  async getDifficulty(query: RecipeAnalyticsQueryDto) {
    const { from, to } = this.parseRange(query);
    const recipes = await this.repository.findRecipes(from, to);

    const buckets = {
      easy: 0,
      medium: 0,
      hard: 0,
    };

    for (const recipe of recipes) {
      const difficulty = this.normalizeDifficulty(recipe.difficulty);
      buckets[difficulty] += 1;
    }

    const total = recipes.length;

    return [
      { difficulty: 'easy', count: buckets.easy },
      { difficulty: 'medium', count: buckets.medium },
      { difficulty: 'hard', count: buckets.hard },
    ].map((row) => ({
      ...row,
      pct: total === 0 ? 0 : this.round2((row.count / total) * 100),
    }));
  }

  async getUsage(query: RecipeAnalyticsQueryDto) {
    const { from, to } = this.parseRange(query);
    const recipes = await this.repository.findRecipes(from, to);

    const mealEvents = recipes.flatMap((r) =>
      r.meals.map((m) => ({ recipeId: r.id, userId: m.userId })),
    );

    const perRecipe = new Map<string, number>();
    const userIds = new Set<string>();

    for (const event of mealEvents) {
      perRecipe.set(event.recipeId, (perRecipe.get(event.recipeId) ?? 0) + 1);
      userIds.add(event.userId);
    }

    const recipesCooked = perRecipe.size;
    const repeatCooked = [...perRecipe.values()].filter((count) => count > 1)
      .length;
    const oneTime = [...perRecipe.values()].filter((count) => count === 1)
      .length;

    return {
      recipesCooked,
      totalCookEvents: mealEvents.length,
      uniqueUsersCooked: userIds.size,
      repeatCookedPct:
        recipesCooked === 0
          ? 0
          : this.round2((repeatCooked / recipesCooked) * 100),
      oneTimePct:
        recipesCooked === 0
          ? 0
          : this.round2((oneTime / recipesCooked) * 100),
      avgCookEventsPerRecipe:
        recipesCooked === 0
          ? 0
          : this.round2(mealEvents.length / recipesCooked),
    };
  }

  private parseRange(query: RecipeAnalyticsQueryDto) {
    const fromRaw = query.from ?? null;
    const toRaw = query.to ?? null;

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && Number.isNaN(from.getTime())) {
      throw new BadRequestException('Invalid from date. Expected ISO date.');
    }

    if (to && Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid to date. Expected ISO date.');
    }

    if (from && to && from > to) {
      throw new BadRequestException('Invalid date range: from must be <= to.');
    }

    return { from, to, fromRaw, toRaw };
  }

  private scoreRecipe(recipe: RecipeAnalyticsRow): RecipeScore {
    const cookCount = recipe.meals.length;
    const ratingCount = Math.max(recipe.ratingCount ?? 0, 0);
    const rating = Math.max(recipe.rating ?? 0, 0);
    const recencyDays =
      (Date.now() - recipe.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 30 - recencyDays) * 0.4;

    const viewCount = Math.max(
      0,
      Math.round(cookCount * 4 + ratingCount * 3 + (recipe.isPublic ? 30 : 12)),
    );
    const savedCount = Math.max(
      0,
      Math.round(cookCount * 2 + ratingCount * 1.5 + recipe.dietaryLabels.length * 3),
    );
    const trendScore =
      cookCount * 1.8 +
      savedCount * 0.7 +
      viewCount * 0.25 +
      rating * 2.5 +
      ratingCount * 0.35 +
      recencyBoost;

    return {
      recipeId: recipe.id,
      title: recipe.title,
      cookCount,
      viewCount,
      savedCount,
      trendScore,
      rating,
      ratingCount,
    };
  }

  private getNutritionInfo(nutritionalInfo: Prisma.JsonValue | null): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    salt: number;
  } {
    const info = this.asObject(nutritionalInfo);

    return {
      calories: this.num(info.calories),
      protein: this.num(info.protein),
      carbs: this.num(info.carbs),
      fat: this.num(info.fat),
      fiber: this.num(info.fiber),
      sugar: this.num(info.sugar),
      salt: this.num(info.salt),
    };
  }

  private getSustainabilityInfo(
    nutritionalInfo: Prisma.JsonValue | null,
    fallbackScore: number | null,
  ): {
    ecoScore: number;
    sustainabilityScore: number;
    co2Footprint: number;
    waterFootprint: number;
    seasonalSharePct: number;
    localSharePct: number;
  } {
    const info = this.asObject(nutritionalInfo);

    return {
      ecoScore: this.num(info.ecoScore),
      sustainabilityScore:
        this.num(info.sustainabilityScore) || this.num(fallbackScore),
      co2Footprint: this.num(info.co2Footprint),
      waterFootprint: this.num(info.waterFootprint),
      seasonalSharePct: this.toPct(this.num(info.seasonalShare)),
      localSharePct: this.toPct(this.num(info.localShare)),
    };
  }

  private normalizeDifficulty(value: string | null): 'easy' | 'medium' | 'hard' {
    const normalized = (value ?? '').trim().toLowerCase();
    if (normalized.includes('easy')) return 'easy';
    if (normalized.includes('hard')) return 'hard';
    return 'medium';
  }

  private categorizeIngredient(name: string): string {
    const value = name.trim().toLowerCase();

    const rules: Array<{ category: string; terms: string[] }> = [
      {
        category: 'vegetables',
        terms: [
          'tomato',
          'onion',
          'pepper',
          'broccoli',
          'carrot',
          'spinach',
          'cabbage',
          'lettuce',
          'zucchini',
        ],
      },
      {
        category: 'fruits',
        terms: ['apple', 'banana', 'lemon', 'orange', 'berries', 'avocado'],
      },
      {
        category: 'protein',
        terms: [
          'chicken',
          'beef',
          'pork',
          'tofu',
          'tempeh',
          'lentil',
          'bean',
          'fish',
          'salmon',
          'tuna',
          'egg',
        ],
      },
      {
        category: 'grains',
        terms: [
          'rice',
          'pasta',
          'quinoa',
          'oat',
          'flour',
          'bread',
          'noodle',
        ],
      },
      {
        category: 'dairy',
        terms: ['milk', 'yogurt', 'cheese', 'cream', 'butter'],
      },
      {
        category: 'fats-oils',
        terms: ['oil', 'olive', 'coconut', 'sesame'],
      },
      {
        category: 'spices-condiments',
        terms: ['salt', 'pepper', 'garlic', 'ginger', 'curry', 'soy', 'vinegar'],
      },
    ];

    const match = rules.find((rule) => rule.terms.some((term) => value.includes(term)));
    return match?.category ?? 'other';
  }

  private pct(rows: RecipeAnalyticsRow[], label: DietLabel): number {
    if (rows.length === 0) return 0;
    const count = rows.filter((r) => r.dietaryLabels.includes(label)).length;
    return this.round2((count / rows.length) * 100);
  }

  private shannonIndex(counts: Map<string, number>): number {
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    if (total === 0) {
      return 0;
    }

    let sum = 0;
    for (const count of counts.values()) {
      const p = count / total;
      if (p > 0) {
        sum -= p * Math.log(p);
      }
    }
    return sum;
  }

  private groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
    const grouped = new Map<K, T[]>();
    for (const item of items) {
      const key = keyFn(item);
      const bucket = grouped.get(key) ?? [];
      bucket.push(item);
      grouped.set(key, bucket);
    }
    return grouped;
  }

  private asObject(value: Prisma.JsonValue | null): Record<string, unknown> {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private num(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  }

  private toPct(value: number): number {
    if (value <= 1) {
      return value * 100;
    }
    return value;
  }

  private avg(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
