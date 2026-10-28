import { Injectable } from '@nestjs/common';
import { TranslationService } from '../../translations/services/translation.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import { LEARNING_SEARCH_FIELDS } from '../utils/learning-filters';

@Injectable()
export class LearningTranslationHelper {
  constructor(private readonly translationService: TranslationService) {}

  resolveLocale(lang?: string): string {
    return this.translationService.resolveLocale(lang);
  }

  /**
   * Ids whose translated search fields contain `query.search`, for the list
   * where-builders. Empty for English or when there is no search.
   */
  async findSearchMatches(
    entityType: keyof typeof LEARNING_SEARCH_FIELDS,
    query: { search?: string; lang?: string },
  ): Promise<string[]> {
    if (!query.search) return [];
    return this.translationService.findEntityIdsByValue(
      entityType,
      this.resolveLocale(query.lang),
      [...LEARNING_SEARCH_FIELDS[entityType]],
      query.search,
    );
  }

  async overlayFields<T extends { id: string }>(
    entityType:
      | 'Dimension'
      | 'Topic'
      | 'FoodFact'
      | 'Quiz'
      | 'QuizOption'
      | 'Quest'
      | 'MicroLearning'
      | 'Mission'
      | 'Challenge',
    items: T[],
    locale: string,
    fields: string[],
    fallbacks: (item: T) => Record<string, string | null | undefined>,
  ): Promise<Record<string, Record<string, string | null>>> {
    if (items.length === 0 || locale === DEFAULT_LOCALE) {
      return Object.fromEntries(
        items.map((item) => {
          const fb = fallbacks(item);
          const mapped: Record<string, string | null> = {};
          for (const field of fields) {
            const v = fb[field];
            mapped[field] = v == null || v === '' ? null : v;
          }
          return [item.id, mapped];
        }),
      );
    }

    return this.translationService.resolveMany(
      entityType,
      items.map((i) => i.id),
      locale,
      fields,
      Object.fromEntries(items.map((i) => [i.id, fallbacks(i)])),
    );
  }
}
