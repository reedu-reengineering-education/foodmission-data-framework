import { Injectable, NotFoundException } from '@nestjs/common';
import { GenericFoodRepository } from '../repositories/generic-food.repository';
import { GenericFoodResponseDto } from '../dto/generic-food-response.dto';
import { FoodGroupResponseDto } from '../dto/food-group-response.dto';
import { CreateGenericFoodDto } from '../dto/create-generic-food.dto';
import { UpdateGenericFoodDto } from '../dto/update-generic-food.dto';
import { GenericFoodQueryDto } from '../dto/generic-food-query.dto';
import { TranslationService } from '../../translations/services/translation.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import { toFoodGroupSlug } from '../utils/food-group-slug.util';
import { FoodSearchRepository } from '../repositories/food-search.repository';
import {
  GenericFoodListItemDto,
  PaginatedGenericFoodListResponseDto,
} from '../dto/generic-food-list-item.dto';
import {
  parseSearchQuery,
  rankFoodSearch,
  SearchQuery,
} from '../search/food-search.ranking';
import type { GenericFood } from '@prisma/client';

const GENERIC_FOOD_TRANSLATABLE_FIELDS = [
  'foodName',
  'foodGroup',
  'remark',
  'synonym',
] as const;

@Injectable()
export class GenericFoodService {
  constructor(
    private readonly genericFoodRepository: GenericFoodRepository,
    private readonly foodSearchRepository: FoodSearchRepository,
    private readonly translationService: TranslationService,
  ) {}

  async create(
    createDto: CreateGenericFoodDto,
  ): Promise<GenericFoodResponseDto> {
    const category = await this.genericFoodRepository.create(createDto);
    return this.toResponse(category);
  }

  /**
   * The generic-food catalogue. With `search` (or `foodex2Code`) it is the
   * user-facing food search; without, the plain NEVO listing.
   */
  async findAll(
    query: GenericFoodQueryDto,
  ): Promise<PaginatedGenericFoodListResponseDto> {
    const locale = this.translationService.resolveLocale(query.lang);
    const searchQuery = parseSearchQuery(query.search);

    if (searchQuery || query.foodex2Code) {
      return this.search(query, searchQuery, locale);
    }

    const localizedFoodGroupIds =
      locale !== DEFAULT_LOCALE && query.foodGroup
        ? await this.translationService.findEntityIdsByValue(
            'GenericFood',
            locale,
            ['foodGroup'],
            query.foodGroup,
          )
        : undefined;

    const result = await this.genericFoodRepository.findAll(
      query,
      localizedFoodGroupIds ? { localizedFoodGroupIds } : undefined,
    );

    const items = await this.overlayTranslations(result.items, locale);

    return {
      ...result,
      items,
    };
  }

  /**
   * Ranked search; see `rankFoodSearch` for the rules. Every row is a real
   * NEVO record — a FoodEx2 concept the query named carries its canonical
   * record, under the concept's name.
   */
  private async search(
    query: GenericFoodQueryDto,
    searchQuery: SearchQuery | null,
    locale: string,
  ): Promise<PaginatedGenericFoodListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { records, concepts } =
      await this.foodSearchRepository.findCandidates({
        stem: searchQuery?.stem ?? null,
        locale,
        foodGroup: query.foodGroup,
        foodex2Code: query.foodex2Code,
        includeConcepts: !query.foodex2Code,
      });
    const hits = rankFoodSearch(records, concepts, searchQuery, {
      collapse: !query.foodex2Code,
    });
    const pageHits = hits.slice((page - 1) * limit, page * limit);

    const groupCodes = pageHits
      .map((hit) => hit.groupCode)
      .filter((code): code is string => code !== null);
    const [foods, variantCounts] = await Promise.all([
      this.genericFoodRepository.findByNevoCodes(
        pageHits.map((hit) => hit.nevoCode),
      ),
      this.foodSearchRepository.countRecordsByCode([...new Set(groupCodes)]),
    ]);
    const localized = new Map(
      (await this.overlayTranslations(foods, locale)).map((food) => [
        food.nevoCode,
        food,
      ]),
    );

    const items = pageHits.flatMap((hit): GenericFoodListItemDto[] => {
      const food = localized.get(hit.nevoCode);
      // Deleted between the two reads; drop it rather than emit no values.
      if (!food) return [];
      return [
        {
          ...food,
          foodName: hit.concept?.displayName ?? food.foodName,
          isConcept: hit.concept !== null,
          foodex2Code: hit.groupCode,
          variantCount: hit.groupCode
            ? (variantCounts.get(hit.groupCode) ?? 1)
            : 1,
          nevoFoodName: food.foodName,
        },
      ];
    });

    return {
      items,
      total: hits.length,
      page,
      limit,
      totalPages: Math.ceil(hits.length / limit),
    };
  }

  async findById(id: string, lang?: string): Promise<GenericFoodResponseDto> {
    const category = await this.genericFoodRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Generic food with ID '${id}' not found`);
    }

    const locale = this.translationService.resolveLocale(lang);
    const [localized] = await this.overlayTranslations([category], locale);
    return localized;
  }

  async update(
    id: string,
    updateDto: UpdateGenericFoodDto,
  ): Promise<GenericFoodResponseDto> {
    await this.findById(id);

    const updated = await this.genericFoodRepository.update(id, updateDto);
    return this.toResponse(updated);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.translationService.deleteForEntity('GenericFood', id);
    await this.genericFoodRepository.delete(id);
  }

  async getAllFoodGroups(
    search?: string,
    lang?: string,
  ): Promise<FoodGroupResponseDto[]> {
    const locale = this.translationService.resolveLocale(lang);
    const groups = await this.genericFoodRepository.getDistinctFoodGroups();

    let result: FoodGroupResponseDto[];

    if (locale === DEFAULT_LOCALE) {
      result = groups.map(({ foodGroup }) => ({
        slug: toFoodGroupSlug(foodGroup),
        name: foodGroup,
      }));
    } else {
      const sampleIds = groups.map((g) => g.sampleId);
      const fallbackById = Object.fromEntries(
        groups.map((g) => [g.sampleId, { foodGroup: g.foodGroup }]),
      );

      const localized = await this.translationService.resolveMany(
        'GenericFood',
        sampleIds,
        locale,
        ['foodGroup'],
        fallbackById,
      );

      result = groups.map(({ foodGroup, sampleId }) => ({
        slug: toFoodGroupSlug(foodGroup),
        name: localized[sampleId]?.foodGroup ?? foodGroup,
      }));
    }

    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(q));
    }

    return result;
  }

  private toResponse(
    item: GenericFood & { remark?: string | null },
  ): GenericFoodResponseDto {
    return {
      ...item,
      foodGroupSlug: toFoodGroupSlug(item.foodGroup),
    };
  }

  private async overlayTranslations(
    items: GenericFood[],
    locale: string,
  ): Promise<GenericFoodResponseDto[]> {
    if (items.length === 0) {
      return [];
    }

    if (locale === DEFAULT_LOCALE) {
      return items.map((item) => ({
        ...this.toResponse(item),
        remark: null,
      }));
    }

    const fallbackById = Object.fromEntries(
      items.map((item) => [
        item.id,
        {
          foodName: item.foodName,
          foodGroup: item.foodGroup,
          remark: null,
          synonym: item.synonym,
        },
      ]),
    );

    const localized = await this.translationService.resolveMany(
      'GenericFood',
      items.map((i) => i.id),
      locale,
      [...GENERIC_FOOD_TRANSLATABLE_FIELDS],
      fallbackById,
    );

    return items.map((item) => {
      const overlay = localized[item.id] ?? {};
      return {
        ...item,
        foodGroupSlug: toFoodGroupSlug(item.foodGroup),
        foodName: overlay.foodName ?? item.foodName,
        foodGroup: overlay.foodGroup ?? item.foodGroup,
        synonym: overlay.synonym ?? item.synonym,
        remark: overlay.remark ?? null,
      };
    });
  }
}
