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
import { rankSearchCandidates } from '../utils/search-ranking';
import { sortByFoodGroupOrder } from '../utils/food-group-order.util';
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
    private readonly translationService: TranslationService,
  ) {}

  async create(
    createDto: CreateGenericFoodDto,
  ): Promise<GenericFoodResponseDto> {
    const category = await this.genericFoodRepository.create(createDto);
    return this.toResponse(category);
  }

  async findAll(query: GenericFoodQueryDto) {
    const locale = this.translationService.resolveLocale(query.lang);

    const localizedFoodGroupIds =
      locale !== DEFAULT_LOCALE && query.foodGroup
        ? await this.translationService.findEntityIdsByValue(
            'GenericFood',
            locale,
            ['foodGroup'],
            query.foodGroup,
          )
        : undefined;

    const search = query.search?.trim();
    if (search) {
      return this.searchRanked(query, search, locale, localizedFoodGroupIds);
    }

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
   * Search ordered by relevance (see utils/search-ranking.ts) instead of A–Z.
   * Close typos are returned only when nothing contains the term. The ranked id list is filtered by food
   * group and paged here; full rows are loaded only for the current page.
   */
  private async searchRanked(
    query: GenericFoodQueryDto,
    search: string,
    locale: string,
    localizedFoodGroupIds?: string[],
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const candidates = await this.genericFoodRepository.findSearchCandidates(
      search,
      locale,
    );
    // Typo matches only as a fallback: short words share many trigrams
    // ("pasta" ~ "pastry"), so mixing them into a search that already has
    // real hits mostly adds noise.
    const hasSubstringMatch = candidates.some((c) => c.substringMatch);
    let rankedIds = rankSearchCandidates(
      search,
      candidates.filter((c) => !hasSubstringMatch || c.substringMatch),
      locale,
    ).map((c) => c.id);

    if (query.foodGroup) {
      const allowed = new Set(
        await this.genericFoodRepository.filterIdsByFoodGroup(
          rankedIds,
          query.foodGroup,
          localizedFoodGroupIds,
        ),
      );
      rankedIds = rankedIds.filter((id) => allowed.has(id));
    }

    const total = rankedIds.length;
    const pageIds = rankedIds.slice((page - 1) * limit, page * limit);
    const rows = await this.genericFoodRepository.findByIds(pageIds);
    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const ordered = pageIds
      .map((id) => rowsById.get(id))
      .filter((row): row is GenericFood => row !== undefined);

    return {
      items: await this.overlayTranslations(ordered, locale),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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

    return sortByFoodGroupOrder(result);
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
