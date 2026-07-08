import { Injectable } from '@nestjs/common';
import {
  ActivityLevel,
  AnnualIncomeLevel,
  EducationLevel,
  Gender,
  GroupRole,
  MealCategory,
  MealCourse,
  DietaryLabel,
  TypeOfMeal,
  Unit,
} from '@prisma/client';
import ISO6391 from 'iso-639-1';
import iso3166 from 'iso-3166-2';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { SHOPPING_RESPONSIBILITY_ENTRIES } from '../catalog.constants';
import { CatalogValueDto } from '../dto/catalog-value.dto';
import {
  CatalogListResponseDto,
  CatalogStartupResponseDto,
  PaginatedCatalogListResponseDto,
} from '../dto/catalog-response.dto';
import {
  filterLocalizedItems,
  normalizeSearch,
  titleCaseFromEnum,
  toPaginatedResponse,
} from './catalog.service.helpers';

@Injectable()
export class CatalogService {
  constructor(private readonly i18n: I18nService) {}

  private cached: {
    countries?: CatalogValueDto[];
    regionsAll?: CatalogValueDto[];
  } = {};

  private readonly displayNamesByType: Record<
    'language' | 'region',
    Map<string, Intl.DisplayNames>
  > = {
    language: new Map<string, Intl.DisplayNames>(),
    region: new Map<string, Intl.DisplayNames>(),
  };

  private resolveLanguage(langOverride?: string): string {
    const candidate = (
      langOverride ??
      I18nContext.current()?.lang ??
      DEFAULT_LOCALE
    )
      .trim()
      .toLowerCase();

    if ((SUPPORTED_LOCALES as readonly string[]).includes(candidate)) {
      return candidate;
    }

    return DEFAULT_LOCALE;
  }

  private getDisplayNamesForLocale(
    lang: string,
    type: 'language' | 'region',
  ): Intl.DisplayNames | null {
    const normalizedLang = this.resolveLanguage(lang);
    const cache = this.displayNamesByType[type];
    const cached = cache.get(normalizedLang);
    if (cached) {
      return cached;
    }

    try {
      const instance = new Intl.DisplayNames([normalizedLang], {
        type,
      });
      cache.set(normalizedLang, instance);
      return instance;
    } catch {
      return null;
    }
  }

  private localizeLanguageLabel(
    languageCode: string,
    lang: string,
    fallback: string,
  ): string {
    const displayNames = this.getDisplayNamesForLocale(lang, 'language');
    const localized = displayNames?.of(languageCode.toLowerCase());

    if (typeof localized === 'string' && localized.trim().length > 0) {
      return localized;
    }

    return fallback;
  }

  private localizeCountryLabel(
    countryCode: string,
    lang: string,
    fallback: string,
  ): string {
    const regionDisplayNames = this.getDisplayNamesForLocale(lang, 'region');
    const localized = regionDisplayNames?.of(countryCode.toUpperCase());

    if (typeof localized === 'string' && localized.trim().length > 0) {
      return localized;
    }

    return fallback;
  }

  private translateCatalogKey(
    path: string,
    fallback: string,
    langOverride?: string,
  ): string {
    const translated = this.i18n.translate(`catalog.${path}`, {
      lang: this.resolveLanguage(langOverride),
      defaultValue: fallback,
    });

    return typeof translated === 'string' ? translated : fallback;
  }

  private mapEnumCatalogValues<T extends string>(
    values: T[],
    section: string,
  ): CatalogValueDto[] {
    return values.map((code) => ({
      code,
      label: this.translateCatalogKey(
        `${section}.${code}`,
        titleCaseFromEnum(code),
      ),
    }));
  }

  private enumSection(
    values: string[],
    section: string,
  ): CatalogListResponseDto {
    return {
      data: this.mapEnumCatalogValues(values, section),
    };
  }

  private getAllCountries(): CatalogValueDto[] {
    if (this.cached.countries) return this.cached.countries;

    // Use iso-3166-2 dataset (alpha-2 -> country name). This covers countries present in ISO 3166-2.
    const byCountry = (iso3166 as any).data as Record<
      string,
      { name?: string }
    >;
    const list = Object.entries(byCountry)
      .map(([code, v]) => ({ code, label: v?.name ?? '' }))
      .filter((x) => x.label)
      .sort((a, b) => a.label.localeCompare(b.label));
    this.cached.countries = list;
    return list;
  }

  private getAllRegions(): CatalogValueDto[] {
    if (this.cached.regionsAll) return this.cached.regionsAll;

    // iso-3166-2 provides subdivisions grouped by alpha-2 country code.
    const byCountry = (iso3166 as any).data as Record<
      string,
      | { name?: string; sub?: Record<string, { type?: string; name: string }> }
      | Record<string, { type?: string; name: string }>
    >;
    const list: CatalogValueDto[] = [];
    for (const [countryCode, subs] of Object.entries(byCountry)) {
      const subMap =
        (subs as any)?.sub && typeof (subs as any).sub === 'object'
          ? ((subs as any).sub as Record<
              string,
              { type?: string; name: string }
            >)
          : (subs as Record<string, { type?: string; name: string }>);

      for (const [code, s] of Object.entries(subMap)) {
        if (!s?.name) continue;
        list.push({
          code,
          label: s.name,
          meta: { countryCode },
        });
      }
    }
    list.sort((a, b) => a.label.localeCompare(b.label));
    this.cached.regionsAll = list;
    return list;
  }

  listGenders(): CatalogListResponseDto {
    return this.enumSection(Object.values(Gender), 'genders');
  }

  listActivityLevels(): CatalogListResponseDto {
    return this.enumSection(Object.values(ActivityLevel), 'activityLevels');
  }

  listEducationLevels(): CatalogListResponseDto {
    return this.enumSection(Object.values(EducationLevel), 'educationLevels');
  }

  listAnnualIncomeLevels(): CatalogListResponseDto {
    return this.enumSection(
      Object.values(AnnualIncomeLevel),
      'annualIncomeLevels',
    );
  }

  listUnits(): CatalogListResponseDto {
    return this.enumSection(Object.values(Unit), 'units');
  }

  listTypeOfMeals(): CatalogListResponseDto {
    return this.enumSection(Object.values(TypeOfMeal), 'typeOfMeals');
  }

  listMealCategories(): CatalogListResponseDto {
    return this.enumSection(Object.values(MealCategory), 'mealCategories');
  }

  listMealCourses(): CatalogListResponseDto {
    return this.enumSection(Object.values(MealCourse), 'mealCourses');
  }

  listGroupRoles(): CatalogListResponseDto {
    return this.enumSection(Object.values(GroupRole), 'groupRoles');
  }

  listDietaryPreferences(): CatalogListResponseDto {
    return {
      data: Object.values(DietaryLabel).map((code) => ({
        code,
        label: this.translateCatalogKey(
          `dietaryPreferences.${code}`,
          titleCaseFromEnum(code),
        ),
      })),
    };
  }

  listShoppingResponsibilities(): CatalogListResponseDto {
    return {
      data: SHOPPING_RESPONSIBILITY_ENTRIES.map((entry) => ({
        code: entry.code,
        label: this.translateCatalogKey(entry.key, entry.fallback),
      })),
    };
  }

  listLanguages(input: {
    page: number;
    limit: number;
    search?: string;
    lang?: string;
  }): PaginatedCatalogListResponseDto {
    const q = normalizeSearch(input.search);
    const lang = this.resolveLanguage(input.lang);
    const allCodes = ISO6391.getAllCodes();
    const all = allCodes
      .map((code) => {
        const canonicalLabel = ISO6391.getName(code);
        return {
          code,
          canonicalLabel,
          label: this.localizeLanguageLabel(code, lang, canonicalLabel),
        };
      })
      .filter((x) => x.label);

    const filtered = filterLocalizedItems(all, q, (item, query) =>
      item.code.includes(query),
    );

    filtered.sort((a, b) => a.label.localeCompare(b.label, lang));

    return toPaginatedResponse(input, filtered, (item) => ({
      code: item.code,
      label: item.label,
    }));
  }

  listCountries(input: {
    page: number;
    limit: number;
    search?: string;
    lang?: string;
  }): PaginatedCatalogListResponseDto {
    const q = normalizeSearch(input.search);
    const lang = this.resolveLanguage(input.lang);
    const all = this.getAllCountries();

    const localized = all.map((x) => ({
      code: x.code,
      canonicalLabel: x.label,
      label: this.localizeCountryLabel(x.code, lang, x.label),
    }));

    const filtered = filterLocalizedItems(
      localized,
      q,
      (item, query) => item.code.toLowerCase() === query,
    );

    filtered.sort((a, b) => a.label.localeCompare(b.label, lang));

    return toPaginatedResponse(input, filtered, (item) => ({
      code: item.code,
      label: item.label,
    }));
  }

  listRegions(input: {
    page: number;
    limit: number;
    search?: string;
    countryCode?: string;
    lang?: string;
  }): PaginatedCatalogListResponseDto {
    const q = normalizeSearch(input.search);
    const lang = this.resolveLanguage(input.lang);
    const countryCode = (input.countryCode ?? '').trim().toUpperCase();

    const allRegions = this.getAllRegions();
    const all = countryCode
      ? allRegions.filter((r) => r.meta?.countryCode === countryCode)
      : allRegions;

    const localized = all.map((x) => ({
      ...x,
      canonicalLabel: x.label,
      label: this.translateCatalogKey(`regions.${x.code}`, x.label, lang),
    }));

    const filtered = filterLocalizedItems(localized, q, (item, query) =>
      item.code.toLowerCase().includes(query),
    );

    filtered.sort((a, b) => a.label.localeCompare(b.label, lang));

    return toPaginatedResponse(input, filtered, (item) => ({
      code: item.code,
      label: item.label,
      meta: item.meta,
    }));
  }

  startup(): CatalogStartupResponseDto {
    return {
      data: {
        genders: this.listGenders().data,
        activityLevels: this.listActivityLevels().data,
        educationLevels: this.listEducationLevels().data,
        annualIncomeLevels: this.listAnnualIncomeLevels().data,
        dietaryPreferences: this.listDietaryPreferences().data,
        shoppingResponsibilities: this.listShoppingResponsibilities().data,
      },
    };
  }
}
