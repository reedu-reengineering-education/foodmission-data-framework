import { Injectable, NotFoundException } from '@nestjs/common';
import { GenericFood } from '@prisma/client';
import {
  Foodex2Repository,
  Foodex2SearchRow,
} from '../repositories/foodex2.repository';
import { Foodex2FoodResponseDto } from '../dto/foodex2-food-response.dto';
import { Foodex2SearchQueryDto } from '../dto/foodex2-search-query.dto';
import { toFoodGroupSlug } from '../utils/food-group-slug.util';
import { TranslationService } from '../../translations/services/translation.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';

/**
 * The user-facing food vocabulary.
 *
 * Users search FoodEx2 concepts ("Dried pasta"), not the NEVO variants behind
 * them ("Pasta white raw", "Pasta white wo egg boiled", …). Each concept
 * resolves to exactly one canonical NEVO record, and the nutritional values are
 * that record's — callers never see an aggregate.
 */
@Injectable()
export class Foodex2FoodService {
  constructor(
    private readonly foodex2Repository: Foodex2Repository,
    private readonly translationService: TranslationService,
  ) {}

  async search(query: Foodex2SearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const locale = this.translationService.resolveLocale(query.lang);

    const { rows, total } = await this.foodex2Repository.search({
      search: query.search,
      coreOnly: query.coreOnly,
      locale,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: await this.toResponses(rows, locale),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByFoodex2Code(
    code: string,
    lang?: string,
  ): Promise<Foodex2FoodResponseDto> {
    const locale = this.translationService.resolveLocale(lang);
    const row = await this.foodex2Repository.findByCode(code, locale);
    if (!row) {
      throw new NotFoundException(
        `FoodEx2 food with code '${code}' not found or has no canonical NEVO item`,
      );
    }

    const [response] = await this.toResponses([row], locale);
    return response;
  }

  /** Hydrates concepts with the nutrients of their canonical NEVO record. */
  private async toResponses(
    rows: Foodex2SearchRow[],
    locale: string,
  ): Promise<Foodex2FoodResponseDto[]> {
    const genericFoods =
      await this.foodex2Repository.findGenericFoodsByNevoCodes(
        rows.map((row) => row.nevoCode),
      );

    const remarks = await this.resolveRemarks(
      [...genericFoods.values()],
      locale,
    );

    return rows.flatMap((row) => {
      const food = genericFoods.get(row.nevoCode);
      // The canonical mapping has a foreign key onto GenericFood, so a miss
      // means the row was deleted mid-request; drop it rather than emit a food
      // with no nutritional values.
      return food
        ? [this.toResponse(row, food, remarks.get(food.id) ?? null)]
        : [];
    });
  }

  /**
   * Locale remark of the canonical NEVO record.
   *
   * `remark` has no column on GenericFood — it exists only as a translation —
   * so it has to be resolved separately. GET /generic-foods always returns the
   * key, so this response must too, or a client reading `item.remark` would get
   * `undefined` instead of `null` after switching endpoints.
   */
  private async resolveRemarks(
    foods: GenericFood[],
    locale: string,
  ): Promise<Map<string, string | null>> {
    if (foods.length === 0 || locale === DEFAULT_LOCALE) {
      return new Map(foods.map((food) => [food.id, null]));
    }

    const localized = await this.translationService.resolveMany(
      'GenericFood',
      foods.map((food) => food.id),
      locale,
      ['remark'],
      Object.fromEntries(foods.map((food) => [food.id, { remark: null }])),
    );

    return new Map(
      foods.map((food) => [food.id, localized[food.id]?.remark ?? null]),
    );
  }

  private toResponse(
    row: Foodex2SearchRow,
    food: GenericFood,
    remark: string | null,
  ): Foodex2FoodResponseDto {
    return {
      // Spreading the canonical NEVO record keeps this a superset of
      // GenericFoodResponseDto: `id` stays the GenericFood id (still valid as
      // `genericFoodId` when creating pantry/shopping items) and every nutrient
      // stays flat, exactly where a client of GET /generic-foods expects it.
      ...food,
      foodGroupSlug: toFoodGroupSlug(food.foodGroup),
      // The FoodEx2 concept name is what the user searched for and sees.
      foodName: row.name,
      remark,

      foodex2Code: row.code,
      foodex2Id: row.termId,
      nameEn: row.nameEn,
      shortName: row.shortName,
      isCore: row.isCore,
      parentCode: row.parentCode,
      variantCount: row.variantCount,
      source: {
        nevoCode: food.nevoCode,
        genericFoodId: food.id,
        // Read from the raw record, before `foodName` is overridden above.
        foodName: food.foodName,
        sourceFoodex2Code: row.sourceFoodex2Code,
        hierarchyDepth: row.hierarchyDepth,
      },
    };
  }
}
