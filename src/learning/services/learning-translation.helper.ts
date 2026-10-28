import { Injectable } from '@nestjs/common';
import { TranslationService } from '../../translations/services/translation.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import { LEARNING_SEARCH_FIELDS } from '../utils/learning-filters';
import { searchWords } from '../../common/utils/text-search.util';

@Injectable()
export class LearningTranslationHelper {
  constructor(private readonly translationService: TranslationService) {}

  resolveLocale(lang?: string): string {
    return this.translationService.resolveLocale(lang);
  }

  /**
   * Per search word, the ids whose translated search fields contain it, for
   * the list where-builders. Empty lists for English.
   */
  findSearchMatches(
    entityType: keyof typeof LEARNING_SEARCH_FIELDS,
    query: { search?: string; lang?: string },
  ): Promise<string[][]> {
    const locale = this.resolveLocale(query.lang);
    return Promise.all(
      searchWords(query.search).map((word) =>
        this.translationService.findEntityIdsByValue(
          entityType,
          locale,
          [...LEARNING_SEARCH_FIELDS[entityType]],
          word,
        ),
      ),
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
