import { DEFAULT_LOCALE } from '../../i18n/constants';
import { TranslationService } from '../../translations/services/translation.service';

type TitledEntity = { id: string; title: string };

export async function overlayTitles(
  translationService: TranslationService,
  entityType: 'Mission' | 'Challenge',
  entities: TitledEntity[],
  lang?: string,
): Promise<Record<string, string>> {
  const titles = Object.fromEntries(entities.map((e) => [e.id, e.title]));
  const locale = translationService.resolveLocale(lang);
  if (locale === DEFAULT_LOCALE || entities.length === 0) {
    return titles;
  }

  const overlay = await translationService.resolveMany(
    entityType,
    entities.map((e) => e.id),
    locale,
    ['title'],
    Object.fromEntries(entities.map((e) => [e.id, { title: e.title }])),
  );

  for (const entity of entities) {
    titles[entity.id] = overlay[entity.id]?.title ?? entity.title;
  }
  return titles;
}
