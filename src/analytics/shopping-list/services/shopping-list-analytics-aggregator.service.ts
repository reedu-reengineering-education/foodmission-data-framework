import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  DEMOGRAPHIC_DIMENSIONS,
  DemographicDimension,
  K_ANONYMITY_THRESHOLD,
  K_ANONYMITY_CROSS_DIM_THRESHOLD,
  safeAvg,
  percentile,
  mode,
  distribution,
  FoodFrequencyRow,
  AGE_GROUP_SQL,
  applyKAnonymity,
  aggregateFoodFrequency,
} from '../../common/analytics-utils';

// ============================================================
// Raw SQL row type — joined from shopping_list_items, shopping_lists, users,
// food_products, generic_foods
// ============================================================

interface RawShoppingListRow {
  itemId: string;
  userId: string;
  listId: string;
  createdAt: Date;
  userAgeGroup: string | null;
  userGender: string | null;
  userEducationLevel: string | null;
  userRegion: string | null;
  userCountry: string | null;
  itemType: string;
  quantity: number;
  unit: string;
  // Unified food fields
  foodName: string | null;
  foodGroup: string | null;
  category: string | null;
  // Scores — food_product only
  nutriScoreGrade: string | null;
  ecoScoreGrade: string | null;
  novaGroup: number | null;
  isVegetarian: boolean | null;
  isVegan: boolean | null;
  carbonFootprint: number | null;
}

// ============================================================
// Per-list intermediate aggregate
// ============================================================

interface ListAggregate {
  listId: string;
  userId: string;
  dateKey: string; // "YYYY-MM-DD"
  totalItems: number;
  foodProductItems: number;
  genericFoodItems: number;
  ageGroup: string | null;
  gender: string | null;
  educationLevel: string | null;
  region: string | null;
  country: string | null;
}

// ============================================================
// Output row types
// ============================================================

export type ItemPopularityRow = FoodFrequencyRow;

export interface CategoryPopularityRow {
  date: Date;
  category: string;
  frequency: number;
  uniqueUsers: number;
}

export interface ListPatternsRow {
  date: Date;
  userCount: number;
  totalLists: number;
  avgItemsPerList: number;
  avgListsPerUser: number;
  foodProductPct: number;
  genericFoodPct: number;
}

export interface SustainabilityRow {
  date: Date;
  userCount: number;
  itemCount: number;
  avgCarbonFootprint: number | null;
  nutriScoreDistribution: Record<string, number> | null;
  ecoScoreDistribution: Record<string, number> | null;
  novaDistribution: Record<string, number> | null;
  vegetarianItemPct: number | null;
  veganItemPct: number | null;
  avgUltraProcessedPct: number | null;
  p25UltraProcessedPct: number | null;
  p50UltraProcessedPct: number | null;
  p75UltraProcessedPct: number | null;
}

export interface FoodGroupsRow {
  date: Date;
  foodGroup: string;
  frequency: number;
  uniqueUsers: number;
  avgQuantity: number;
  predominantUnit: string;
}

export interface DemographicPatternsRow {
  date: Date;
  dimensionName: string;
  dimensionValue: string;
  userCount: number;
  totalLists: number;
  avgItemsPerList: number;
  avgListsPerUser: number;
  foodProductPct: number;
  genericFoodPct: number;
}

export interface CrossDimPatternsRow {
  date: Date;
  dim1Name: string;
  dim1Value: string;
  dim2Name: string;
  dim2Value: string;
  userCount: number;
  totalLists: number;
  avgItemsPerList: number;
  avgListsPerUser: number;
  foodProductPct: number;
  genericFoodPct: number;
}

export interface DemographicClassificationRow {
  date: Date;
  dimensionName: string;
  dimensionValue: string;
  userCount: number;
  itemCount: number;
  vegetarianItemPct: number | null;
  veganItemPct: number | null;
  avgUltraProcessedPct: number | null;
  p25UltraProcessedPct: number | null;
  p50UltraProcessedPct: number | null;
  p75UltraProcessedPct: number | null;
  novaDistribution: Record<string, number> | null;
}

export interface CrossDimClassificationRow {
  date: Date;
  dim1Name: string;
  dim1Value: string;
  dim2Name: string;
  dim2Value: string;
  userCount: number;
  itemCount: number;
  vegetarianItemPct: number | null;
  veganItemPct: number | null;
  avgUltraProcessedPct: number | null;
  p25UltraProcessedPct: number | null;
  p50UltraProcessedPct: number | null;
  p75UltraProcessedPct: number | null;
  novaDistribution: Record<string, number> | null;
}

export interface ShoppingListAggregationResult {
  itemPopularity: ItemPopularityRow[];
  categoryPopularity: CategoryPopularityRow[];
  listPatterns: ListPatternsRow[];
  sustainability: SustainabilityRow[];
  foodGroups: FoodGroupsRow[];
  demographicPatterns: DemographicPatternsRow[];
  demographicClassification: DemographicClassificationRow[];
  crossDimPatterns: CrossDimPatternsRow[];
  crossDimClassification: CrossDimClassificationRow[];
  totalRecords: number;
  suppressedGroups: number;
}

// Maps dimension name → field on RawShoppingListRow
const DIM_TO_ROW_FIELD: Record<DemographicDimension, keyof RawShoppingListRow> =
  {
    ageGroup: 'userAgeGroup',
    gender: 'userGender',
    educationLevel: 'userEducationLevel',
    region: 'userRegion',
    country: 'userCountry',
  };

// Maps dimension name → field on ListAggregate
const DIM_TO_LIST_FIELD: Record<DemographicDimension, keyof ListAggregate> = {
  ageGroup: 'ageGroup',
  gender: 'gender',
  educationLevel: 'educationLevel',
  region: 'region',
  country: 'country',
};

@Injectable()
export class ShoppingListAnalyticsAggregator {
  private readonly logger = new Logger(ShoppingListAnalyticsAggregator.name);

  constructor(private readonly prisma: PrismaService) {}

  async aggregate(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ShoppingListAggregationResult> {
    this.logger.log(
      `Aggregating ${periodStart.toISOString()} → ${periodEnd.toISOString()}`,
    );

    const rawData = await this.fetchRawData(periodStart, periodEnd);
    this.logger.log(`Fetched ${rawData.length} raw rows`);

    const listAggs = this.buildListAggregates(rawData);
    this.logger.log(`Built ${listAggs.size} list aggregates`);

    let suppressedGroups = 0;

    const itemPopularity = this.aggregateItemPopularity(rawData);
    const categoryPopularity = this.aggregateCategoryPopularity(rawData);
    const listPatterns = this.aggregateListPatterns(listAggs);
    const sustainability = this.aggregateSustainability(rawData);
    const foodGroups = this.aggregateFoodGroups(rawData);
    const demographicPatterns = this.aggregateDemographicPatterns(listAggs);
    const demographicClassification =
      this.aggregateDemographicClassification(rawData);
    const crossDimPatterns = this.aggregateCrossDimPatterns(listAggs);
    const crossDimClassification =
      this.aggregateCrossDimClassification(rawData);

    // k-anonymity filter (K=5)
    const applyK = <T extends { userCount?: number; uniqueUsers?: number }>(
      rows: T[],
      field: 'userCount' | 'uniqueUsers' = 'userCount',
      threshold = K_ANONYMITY_THRESHOLD,
    ): T[] => {
      const { rows: filtered, suppressed } = applyKAnonymity(
        rows,
        field,
        threshold,
      );
      suppressedGroups += suppressed;
      return filtered;
    };

    const filteredItemPopularity = applyK(itemPopularity, 'uniqueUsers');
    const filteredCategoryPopularity = applyK(
      categoryPopularity,
      'uniqueUsers',
    );
    const filteredListPatterns = applyK(listPatterns);
    const filteredSustainability = applyK(sustainability);
    const filteredFoodGroups = applyK(foodGroups, 'uniqueUsers');
    const filteredDemographicPatterns = applyK(demographicPatterns);
    const filteredDemographicClassification = applyK(demographicClassification);
    const filteredCrossDimPatterns = applyK(
      crossDimPatterns,
      'userCount',
      K_ANONYMITY_CROSS_DIM_THRESHOLD,
    );
    const filteredCrossDimClassification = applyK(
      crossDimClassification,
      'userCount',
      K_ANONYMITY_CROSS_DIM_THRESHOLD,
    );

    const totalRecords =
      filteredItemPopularity.length +
      filteredCategoryPopularity.length +
      filteredListPatterns.length +
      filteredSustainability.length +
      filteredFoodGroups.length +
      filteredDemographicPatterns.length +
      filteredDemographicClassification.length +
      filteredCrossDimPatterns.length +
      filteredCrossDimClassification.length;

    this.logger.log(
      `Aggregation done: ${totalRecords} records, ${suppressedGroups} suppressed ` +
        `(k<${K_ANONYMITY_THRESHOLD} single-dim / k<${K_ANONYMITY_CROSS_DIM_THRESHOLD} cross-dim)`,
    );

    return {
      itemPopularity: filteredItemPopularity,
      categoryPopularity: filteredCategoryPopularity,
      listPatterns: filteredListPatterns,
      sustainability: filteredSustainability,
      foodGroups: filteredFoodGroups,
      demographicPatterns: filteredDemographicPatterns,
      demographicClassification: filteredDemographicClassification,
      crossDimPatterns: filteredCrossDimPatterns,
      crossDimClassification: filteredCrossDimClassification,
      totalRecords,
      suppressedGroups,
    };
  }

  // ============================================================
  // Raw SQL fetch
  // ============================================================

  private async fetchRawData(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<RawShoppingListRow[]> {
    return this.prisma.$queryRaw<RawShoppingListRow[]>`
      SELECT
        sli.id                        AS "itemId",
        sl."userId"                   AS "userId",
        sl.id                         AS "listId",
        sli."createdAt"               AS "createdAt",
        ${AGE_GROUP_SQL}                           AS "userAgeGroup",
        u."gender"::text              AS "userGender",
        u."educationLevel"::text      AS "userEducationLevel",
        u."region"                    AS "userRegion",
        u."country"                   AS "userCountry",
        sli."itemType"                AS "itemType",
        sli."quantity"                AS "quantity",
        sli."unit"::text              AS "unit",
        COALESCE(fp."name", gf."foodName")            AS "foodName",
        COALESCE(gf."foodGroup", fp."categories"[1])  AS "foodGroup",
        COALESCE(fp."categories"[2], fp."categories"[1]) AS "category",
        fp."nutriscoreGrade"          AS "nutriScoreGrade",
        fp."ecoscoreGrade"            AS "ecoScoreGrade",
        fp."novaGroup"                AS "novaGroup",
        fp."isVegetarian"             AS "isVegetarian",
        fp."isVegan"                  AS "isVegan",
        fp."carbonFootprint"          AS "carbonFootprint"
      FROM shopping_list_items sli
      JOIN shopping_lists sl ON sl.id = sli."shoppingListId"
      JOIN users u ON u.id = sl."userId"
      LEFT JOIN food_products fp ON fp.id = sli."foodProductId"
      LEFT JOIN generic_foods gf ON gf.id = sli."genericFoodId"
      WHERE sli."createdAt" >= ${periodStart}
        AND sli."createdAt" < ${periodEnd}
      ORDER BY sl."userId", sl.id, sli."createdAt"
    `;
  }

  // ============================================================
  // Build per-list aggregates
  // ============================================================

  private buildListAggregates(
    rawData: RawShoppingListRow[],
  ): Map<string, ListAggregate> {
    const listMap = new Map<string, ListAggregate>();

    for (const row of rawData) {
      if (!listMap.has(row.listId)) {
        listMap.set(row.listId, {
          listId: row.listId,
          userId: row.userId,
          dateKey: row.createdAt.toISOString().slice(0, 10),
          totalItems: 0,
          foodProductItems: 0,
          genericFoodItems: 0,
          ageGroup: row.userAgeGroup,
          gender: row.userGender,
          educationLevel: row.userEducationLevel,
          region: row.userRegion,
          country: row.userCountry,
        });
      }
      const la = listMap.get(row.listId)!;
      la.totalItems++;
      if (row.itemType === 'food_product') la.foodProductItems++;
      else la.genericFoodItems++;
    }

    return listMap;
  }

  // ============================================================
  // Core aggregations
  // ============================================================

  private aggregateItemPopularity(
    rows: RawShoppingListRow[],
  ): ItemPopularityRow[] {
    const entries = rows
      .filter((r) => r.foodName !== null)
      .map((r) => ({
        date: r.createdAt,
        userId: r.userId,
        foodName: r.foodName!,
        foodGroup: r.foodGroup,
        itemType: r.itemType,
        quantity: r.quantity,
        unit: r.unit,
      }));
    return aggregateFoodFrequency(entries);
  }

  private aggregateCategoryPopularity(
    rows: RawShoppingListRow[],
  ): CategoryPopularityRow[] {
    // Group by (dateKey, category)
    const groups = new Map<
      string,
      { date: Date; category: string; users: Set<string>; count: number }
    >();

    for (const row of rows) {
      const cat = row.category;
      if (!cat) continue;
      const dateKey = row.createdAt.toISOString().slice(0, 10);
      const key = `${dateKey}||${cat}`;
      if (!groups.has(key)) {
        groups.set(key, {
          date: new Date(dateKey),
          category: cat,
          users: new Set(),
          count: 0,
        });
      }
      const g = groups.get(key)!;
      g.users.add(row.userId);
      g.count++;
    }

    return [...groups.values()].map((g) => ({
      date: g.date,
      category: g.category,
      frequency: g.count,
      uniqueUsers: g.users.size,
    }));
  }

  private aggregateListPatterns(
    listAggs: Map<string, ListAggregate>,
  ): ListPatternsRow[] {
    // Group by dateKey
    const groups = new Map<
      string,
      {
        date: Date;
        users: Set<string>;
        lists: ListAggregate[];
      }
    >();

    for (const la of listAggs.values()) {
      if (!groups.has(la.dateKey)) {
        groups.set(la.dateKey, {
          date: new Date(la.dateKey),
          users: new Set(),
          lists: [],
        });
      }
      const g = groups.get(la.dateKey)!;
      g.users.add(la.userId);
      g.lists.push(la);
    }

    return [...groups.values()].map((g) => {
      const userCount = g.users.size;
      const totalLists = g.lists.length;
      const totalItems = g.lists.reduce((s, l) => s + l.totalItems, 0);
      const fpItems = g.lists.reduce((s, l) => s + l.foodProductItems, 0);
      const gfItems = g.lists.reduce((s, l) => s + l.genericFoodItems, 0);
      return {
        date: g.date,
        userCount,
        totalLists,
        avgItemsPerList: totalLists > 0 ? totalItems / totalLists : 0,
        avgListsPerUser: userCount > 0 ? totalLists / userCount : 0,
        foodProductPct: totalItems > 0 ? (fpItems / totalItems) * 100 : 0,
        genericFoodPct: totalItems > 0 ? (gfItems / totalItems) * 100 : 0,
      };
    });
  }

  private aggregateSustainability(
    rows: RawShoppingListRow[],
  ): SustainabilityRow[] {
    // Group by dateKey — use all users for userCount, food_product items for scores
    const groups = new Map<
      string,
      {
        date: Date;
        allUsers: Set<string>;
        fpRows: RawShoppingListRow[];
      }
    >();

    for (const row of rows) {
      const dateKey = row.createdAt.toISOString().slice(0, 10);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: new Date(dateKey),
          allUsers: new Set(),
          fpRows: [],
        });
      }
      const g = groups.get(dateKey)!;
      g.allUsers.add(row.userId);
      if (row.itemType === 'food_product') g.fpRows.push(row);
    }

    return [...groups.values()]
      .filter((g) => g.fpRows.length > 0)
      .map((g) => {
        const fpRows = g.fpRows;
        const itemCount = fpRows.length;

        const carbonValues = fpRows
          .map((r) => r.carbonFootprint)
          .filter((v): v is number => v !== null);
        const nutriScores = fpRows
          .map((r) => r.nutriScoreGrade)
          .filter((v): v is string => v !== null);
        const ecoScores = fpRows
          .map((r) => r.ecoScoreGrade)
          .filter((v): v is string => v !== null);
        const novaGroups = fpRows
          .map((r) => r.novaGroup)
          .filter((v): v is number => v !== null);
        const vegetarianItems = fpRows.filter(
          (r) => r.isVegetarian === true,
        ).length;
        const veganItems = fpRows.filter((r) => r.isVegan === true).length;
        const ultraProcessedItems = fpRows.filter(
          (r) => r.novaGroup === 4,
        ).length;
        const novaTotal = fpRows.filter((r) => r.novaGroup !== null).length;
        const ultraProcessedPcts = fpRows
          .filter((r) => r.novaGroup !== null)
          .map((r) => (r.novaGroup === 4 ? 100 : 0));

        return {
          date: g.date,
          userCount: g.allUsers.size,
          itemCount,
          avgCarbonFootprint: safeAvg(carbonValues),
          nutriScoreDistribution: distribution(nutriScores),
          ecoScoreDistribution: distribution(ecoScores),
          novaDistribution: distribution(novaGroups.map(String)),
          vegetarianItemPct:
            itemCount > 0 ? (vegetarianItems / itemCount) * 100 : null,
          veganItemPct: itemCount > 0 ? (veganItems / itemCount) * 100 : null,
          avgUltraProcessedPct:
            novaTotal > 0 ? (ultraProcessedItems / novaTotal) * 100 : null,
          p25UltraProcessedPct: percentile(ultraProcessedPcts, 25),
          p50UltraProcessedPct: percentile(ultraProcessedPcts, 50),
          p75UltraProcessedPct: percentile(ultraProcessedPcts, 75),
        };
      });
  }

  private aggregateFoodGroups(rows: RawShoppingListRow[]): FoodGroupsRow[] {
    // Group by (dateKey, foodGroup)
    const groups = new Map<
      string,
      {
        date: Date;
        foodGroup: string;
        users: Set<string>;
        quantities: number[];
        units: string[];
      }
    >();

    for (const row of rows) {
      const fg = row.foodGroup;
      if (!fg) continue;
      const dateKey = row.createdAt.toISOString().slice(0, 10);
      const key = `${dateKey}||${fg}`;
      if (!groups.has(key)) {
        groups.set(key, {
          date: new Date(dateKey),
          foodGroup: fg,
          users: new Set(),
          quantities: [],
          units: [],
        });
      }
      const g = groups.get(key)!;
      g.users.add(row.userId);
      g.quantities.push(row.quantity);
      g.units.push(row.unit);
    }

    return [...groups.values()].map((g) => ({
      date: g.date,
      foodGroup: g.foodGroup,
      frequency: g.quantities.length,
      uniqueUsers: g.users.size,
      avgQuantity: safeAvg(g.quantities) ?? 0,
      predominantUnit: mode(g.units) ?? '',
    }));
  }

  // ============================================================
  // Demographic breakdown aggregations
  // ============================================================

  private aggregateDemographicPatterns(
    listAggs: Map<string, ListAggregate>,
  ): DemographicPatternsRow[] {
    const result: DemographicPatternsRow[] = [];

    for (const dim of DEMOGRAPHIC_DIMENSIONS) {
      const dimField = DIM_TO_LIST_FIELD[dim];

      // Group by (dateKey, dimValue)
      const groups = new Map<
        string,
        {
          date: Date;
          dimValue: string;
          users: Set<string>;
          lists: ListAggregate[];
        }
      >();

      for (const la of listAggs.values()) {
        const rawValue = la[dimField] as string | null;
        const dimValue = rawValue ?? '__null__';
        const key = `${la.dateKey}||${dimValue}`;
        if (!groups.has(key)) {
          groups.set(key, {
            date: new Date(la.dateKey),
            dimValue,
            users: new Set(),
            lists: [],
          });
        }
        const g = groups.get(key)!;
        g.users.add(la.userId);
        g.lists.push(la);
      }

      for (const g of groups.values()) {
        const activeValue = g.dimValue === '__null__' ? null : g.dimValue;
        if (activeValue === null) continue; // skip users without this demographic
        const userCount = g.users.size;
        const totalLists = g.lists.length;
        const totalItems = g.lists.reduce((s, l) => s + l.totalItems, 0);
        const fpItems = g.lists.reduce((s, l) => s + l.foodProductItems, 0);
        const gfItems = g.lists.reduce((s, l) => s + l.genericFoodItems, 0);

        result.push({
          date: g.date,
          dimensionName: dim,
          dimensionValue: activeValue,
          userCount,
          totalLists,
          avgItemsPerList: totalLists > 0 ? totalItems / totalLists : 0,
          avgListsPerUser: userCount > 0 ? totalLists / userCount : 0,
          foodProductPct: totalItems > 0 ? (fpItems / totalItems) * 100 : 0,
          genericFoodPct: totalItems > 0 ? (gfItems / totalItems) * 100 : 0,
        });
      }
    }

    return result;
  }

  // ============================================================
  // Cross-dimensional aggregations (K=20)
  // ============================================================

  private aggregateCrossDimPatterns(
    listAggs: Map<string, ListAggregate>,
  ): CrossDimPatternsRow[] {
    const result: CrossDimPatternsRow[] = [];

    for (let i = 0; i < DEMOGRAPHIC_DIMENSIONS.length; i++) {
      for (let j = i + 1; j < DEMOGRAPHIC_DIMENSIONS.length; j++) {
        // Ensure dim1Name < dim2Name alphabetically
        const [dim1, dim2] = [
          DEMOGRAPHIC_DIMENSIONS[i],
          DEMOGRAPHIC_DIMENSIONS[j],
        ].sort() as [DemographicDimension, DemographicDimension];

        const dim1Field = DIM_TO_LIST_FIELD[dim1];
        const dim2Field = DIM_TO_LIST_FIELD[dim2];

        const groups = new Map<
          string,
          {
            date: Date;
            dim1Value: string;
            dim2Value: string;
            users: Set<string>;
            lists: ListAggregate[];
          }
        >();

        for (const la of listAggs.values()) {
          const v1 = (la[dim1Field] as string | null) ?? '__null__';
          const v2 = (la[dim2Field] as string | null) ?? '__null__';
          const key = `${la.dateKey}||${v1}||${v2}`;
          if (!groups.has(key)) {
            groups.set(key, {
              date: new Date(la.dateKey),
              dim1Value: v1,
              dim2Value: v2,
              users: new Set(),
              lists: [],
            });
          }
          const g = groups.get(key)!;
          g.users.add(la.userId);
          g.lists.push(la);
        }

        for (const g of groups.values()) {
          const dim1Value = g.dim1Value === '__null__' ? null : g.dim1Value;
          const dim2Value = g.dim2Value === '__null__' ? null : g.dim2Value;
          if (dim1Value === null || dim2Value === null) continue; // skip if either dim is missing
          const userCount = g.users.size;
          const totalLists = g.lists.length;
          const totalItems = g.lists.reduce((s, l) => s + l.totalItems, 0);
          const fpItems = g.lists.reduce((s, l) => s + l.foodProductItems, 0);
          const gfItems = g.lists.reduce((s, l) => s + l.genericFoodItems, 0);
          result.push({
            date: g.date,
            dim1Name: dim1,
            dim1Value,
            dim2Name: dim2,
            dim2Value,
            userCount,
            totalLists,
            avgItemsPerList: totalLists > 0 ? totalItems / totalLists : 0,
            avgListsPerUser: userCount > 0 ? totalLists / userCount : 0,
            foodProductPct: totalItems > 0 ? (fpItems / totalItems) * 100 : 0,
            genericFoodPct: totalItems > 0 ? (gfItems / totalItems) * 100 : 0,
          });
        }
      }
    }

    return result;
  }

  // ============================================================
  // Classification aggregations — vegetarian/vegan/NOVA/ultra-processed
  // ============================================================

  private aggregateDemographicClassification(
    rows: RawShoppingListRow[],
  ): DemographicClassificationRow[] {
    const result: DemographicClassificationRow[] = [];

    for (const dim of DEMOGRAPHIC_DIMENSIONS) {
      const rowField = DIM_TO_ROW_FIELD[dim];

      const groups = new Map<
        string,
        {
          date: Date;
          dimValue: string;
          users: Set<string>;
          fpRows: RawShoppingListRow[];
        }
      >();

      for (const row of rows) {
        const rawValue = row[rowField] as string | null;
        const dimValue = rawValue ?? '__null__';
        const dateKey = row.createdAt.toISOString().slice(0, 10);
        const key = `${dateKey}||${dimValue}`;
        if (!groups.has(key)) {
          groups.set(key, {
            date: new Date(dateKey),
            dimValue,
            users: new Set(),
            fpRows: [],
          });
        }
        const g = groups.get(key)!;
        g.users.add(row.userId);
        if (row.itemType === 'food_product') g.fpRows.push(row);
      }

      for (const g of groups.values()) {
        const activeValue = g.dimValue === '__null__' ? null : g.dimValue;
        if (activeValue === null) continue; // skip users without this demographic
        const fpRows = g.fpRows;
        const itemCount = fpRows.length;
        const vegetarianItems = fpRows.filter(
          (r) => r.isVegetarian === true,
        ).length;
        const veganItems = fpRows.filter((r) => r.isVegan === true).length;
        const novaValues = fpRows
          .map((r) => r.novaGroup)
          .filter((v): v is number => v !== null);
        const ultraProcessedPcts = fpRows
          .filter((r) => r.novaGroup !== null)
          .map((r) => (r.novaGroup === 4 ? 100 : 0));

        result.push({
          date: g.date,
          dimensionName: dim,
          dimensionValue: activeValue,
          userCount: g.users.size,
          itemCount,
          vegetarianItemPct:
            itemCount > 0 ? (vegetarianItems / itemCount) * 100 : null,
          veganItemPct: itemCount > 0 ? (veganItems / itemCount) * 100 : null,
          avgUltraProcessedPct: safeAvg(ultraProcessedPcts),
          p25UltraProcessedPct: percentile(ultraProcessedPcts, 25),
          p50UltraProcessedPct: percentile(ultraProcessedPcts, 50),
          p75UltraProcessedPct: percentile(ultraProcessedPcts, 75),
          novaDistribution: distribution(novaValues.map(String)),
        });
      }
    }

    return result;
  }

  private aggregateCrossDimClassification(
    rows: RawShoppingListRow[],
  ): CrossDimClassificationRow[] {
    const result: CrossDimClassificationRow[] = [];

    for (let i = 0; i < DEMOGRAPHIC_DIMENSIONS.length; i++) {
      for (let j = i + 1; j < DEMOGRAPHIC_DIMENSIONS.length; j++) {
        const [dim1, dim2] = [
          DEMOGRAPHIC_DIMENSIONS[i],
          DEMOGRAPHIC_DIMENSIONS[j],
        ].sort() as [DemographicDimension, DemographicDimension];

        const dim1Field = DIM_TO_ROW_FIELD[dim1];
        const dim2Field = DIM_TO_ROW_FIELD[dim2];

        const groups = new Map<
          string,
          {
            date: Date;
            dim1Value: string;
            dim2Value: string;
            users: Set<string>;
            fpRows: RawShoppingListRow[];
          }
        >();

        for (const row of rows) {
          const v1 = (row[dim1Field] as string | null) ?? '__null__';
          const v2 = (row[dim2Field] as string | null) ?? '__null__';
          const dateKey = row.createdAt.toISOString().slice(0, 10);
          const key = `${dateKey}||${v1}||${v2}`;
          if (!groups.has(key)) {
            groups.set(key, {
              date: new Date(dateKey),
              dim1Value: v1,
              dim2Value: v2,
              users: new Set(),
              fpRows: [],
            });
          }
          const g = groups.get(key)!;
          g.users.add(row.userId);
          if (row.itemType === 'food_product') g.fpRows.push(row);
        }

        for (const g of groups.values()) {
          const dim1Value = g.dim1Value === '__null__' ? null : g.dim1Value;
          const dim2Value = g.dim2Value === '__null__' ? null : g.dim2Value;
          if (dim1Value === null || dim2Value === null) continue; // skip if either dim is missing
          const fpRows = g.fpRows;
          const itemCount = fpRows.length;
          const vegetarianItems = fpRows.filter(
            (r) => r.isVegetarian === true,
          ).length;
          const veganItems = fpRows.filter((r) => r.isVegan === true).length;
          const novaValues = fpRows
            .map((r) => r.novaGroup)
            .filter((v): v is number => v !== null);
          const ultraProcessedPcts = fpRows
            .filter((r) => r.novaGroup !== null)
            .map((r) => (r.novaGroup === 4 ? 100 : 0));

          result.push({
            date: g.date,
            dim1Name: dim1,
            dim1Value,
            dim2Name: dim2,
            dim2Value,
            userCount: g.users.size,
            itemCount,
            vegetarianItemPct:
              itemCount > 0 ? (vegetarianItems / itemCount) * 100 : null,
            veganItemPct: itemCount > 0 ? (veganItems / itemCount) * 100 : null,
            avgUltraProcessedPct: safeAvg(ultraProcessedPcts),
            p25UltraProcessedPct: percentile(ultraProcessedPcts, 25),
            p50UltraProcessedPct: percentile(ultraProcessedPcts, 50),
            p75UltraProcessedPct: percentile(ultraProcessedPcts, 75),
            novaDistribution: distribution(novaValues.map(String)),
          });
        }
      }
    }

    return result;
  }
}
