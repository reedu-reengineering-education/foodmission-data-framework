import { Injectable, NotFoundException } from '@nestjs/common';
import { GenericFoodRepository } from '../repositories/generic-food.repository';
import { GenericFoodResponseDto } from '../dto/generic-food-response.dto';
import { CreateGenericFoodDto } from '../dto/create-generic-food.dto';
import { UpdateGenericFoodDto } from '../dto/update-generic-food.dto';
import { GenericFoodQueryDto } from '../dto/generic-food-query.dto';
import { TranslationService } from '../../translations/services/translation.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';
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
    return category;
  }

  async findAll(query: GenericFoodQueryDto) {
    const locale = this.translationService.resolveLocale(query.lang);
    const context: {
      localizedSearchIds?: string[];
      localizedFoodGroupIds?: string[];
    } = {};

    if (locale !== DEFAULT_LOCALE) {
      if (query.search) {
        context.localizedSearchIds =
          await this.translationService.findEntityIdsByValue(
            'GenericFood',
            locale,
            ['foodName', 'synonym'],
            query.search,
          );
      }
      if (query.foodGroup) {
        context.localizedFoodGroupIds =
          await this.translationService.findEntityIdsByValue(
            'GenericFood',
            locale,
            ['foodGroup'],
            query.foodGroup,
          );
      }
    }

    const result = await this.genericFoodRepository.findAll(
      query,
      Object.keys(context).length > 0 ? context : undefined,
    );

    const items = await this.overlayTranslations(result.items, locale);

    return {
      ...result,
      items,
    };
  }

  async findById(
    id: string,
    lang?: string,
  ): Promise<GenericFoodResponseDto> {
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
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.translationService.deleteForEntity('GenericFood', id);
    await this.genericFoodRepository.delete(id);
  }

  async getAllFoodGroups(search?: string, lang?: string): Promise<string[]> {
    const locale = this.translationService.resolveLocale(lang);

    if (locale === DEFAULT_LOCALE) {
      return this.genericFoodRepository.getAllFoodGroups(search);
    }

    const translated = await this.translationService.listDistinct(
      'GenericFood',
      locale,
      'foodGroup',
      search,
    );

    if (translated.length > 0) {
      return translated;
    }

    return this.genericFoodRepository.getAllFoodGroups(search);
  }

  private async overlayTranslations(
    items: GenericFood[],
    locale: string,
  ): Promise<(GenericFood & { remark?: string | null })[]> {
    if (items.length === 0) {
      return items;
    }

    if (locale === DEFAULT_LOCALE) {
      return items.map((item) => ({ ...item, remark: null }));
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
        foodName: overlay.foodName ?? item.foodName,
        foodGroup: overlay.foodGroup ?? item.foodGroup,
        synonym: overlay.synonym ?? item.synonym,
        remark: overlay.remark ?? null,
      };
    });
  }
}
