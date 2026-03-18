import { BadRequestException, Injectable } from '@nestjs/common';
import ISO6391 from 'iso-639-1';
import countries from 'i18n-iso-countries';
import iso3166 from 'iso-3166-2';
import { pageLimitToSkipTake } from '../../common/utils/pagination';
import { StaticValueDto } from '../dto/static-value.dto';
import {
  PaginatedStaticValuesListResponseDto,
  StaticValuesListResponseDto,
} from '../dto/static-values-response.dto';
import {
  ACTIVITY_LEVELS,
  ANNUAL_INCOME_LEVELS,
  EDUCATION_LEVELS,
  GENDERS,
  GROUP_ROLES,
  MEAL_TYPES,
  TYPE_OF_MEALS,
  UNITS,
} from '../static-values.constants';

function titleCaseFromEnum(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function normalizeSearch(s?: string): string | undefined {
  const v = (s ?? '').trim();
  return v.length ? v.toLowerCase() : undefined;
}

@Injectable()
export class StaticValuesService {
  private cached: {
    countries?: StaticValueDto[];
    regionsAll?: StaticValueDto[];
  } = {};

  private getAllCountries(): StaticValueDto[] {
    if (this.cached.countries) return this.cached.countries;

    // i18n-iso-countries ships its own data; default to English labels.
    const names = countries.getNames('en', { select: 'official' }) as Record<
      string,
      string
    >;
    const list = Object.entries(names)
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    this.cached.countries = list;
    return list;
  }

  private getAllRegions(): StaticValueDto[] {
    if (this.cached.regionsAll) return this.cached.regionsAll;

    // iso-3166-2 provides subdivisions grouped by alpha-2 country code.
    // Shape (observed):
    // {
    //   [countryCode]: {
    //     name: string,
    //     sub: { [subdivisionCode]: { type?: string, name: string } }
    //   }
    // }
    const byCountry = (iso3166 as any).data as Record<
      string,
      | { name?: string; sub?: Record<string, { type?: string; name: string }> }
      | Record<string, { type?: string; name: string }>
    >;
    const list: StaticValueDto[] = [];
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

  listGenders(): StaticValuesListResponseDto {
    return {
      data: GENDERS.map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listActivityLevels(): StaticValuesListResponseDto {
    return {
      data: ACTIVITY_LEVELS.map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listEducationLevels(): StaticValuesListResponseDto {
    return {
      data: EDUCATION_LEVELS.map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listAnnualIncomeLevels(): StaticValuesListResponseDto {
    return {
      data: ANNUAL_INCOME_LEVELS.map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listUnits(): StaticValuesListResponseDto {
    return {
      data: UNITS.map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listTypeOfMeals(): StaticValuesListResponseDto {
    return {
      data: TYPE_OF_MEALS.map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listMealTypes(): StaticValuesListResponseDto {
    return {
      data: MEAL_TYPES.map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listGroupRoles(): StaticValuesListResponseDto {
    return {
      data: GROUP_ROLES.map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  /**
   * Dietary preferences – Phase 1
   * - NONE: no recipe filters
   * - VEGAN / VEGETARIAN: map to recipe tag filtering (existing API supports ?tags=)
   *
   * Phase 2 (planned, not implemented here):
   * - FREE_FROM_* options that require recipe API support for negative allergen filters.
   */
  listDietaryPreferencesPhase1(): StaticValuesListResponseDto {
    const data: StaticValueDto[] = [
      { code: 'NONE', label: 'No specific dietary preference' },
      {
        code: 'VEGAN',
        label: 'Vegan',
        meta: { recipeFilter: { includeTags: ['vegan'] } },
      },
      {
        code: 'VEGETARIAN',
        label: 'Vegetarian',
        meta: { recipeFilter: { includeTags: ['vegetarian'] } },
      },
    ];
    return { data };
  }

  listShoppingResponsibilities(): StaticValuesListResponseDto {
    // Stored in JSON preferences (User.preferences or GroupMembership.preferences), not as a DB enum.
    const data: StaticValueDto[] = [
      { code: 'NO_SPECIFIC', label: 'No specific answer' },
      { code: 'MOSTLY_ME', label: 'Mostly me' },
      { code: 'SHARED_EQUALLY', label: 'Shared equally' },
      { code: 'MOSTLY_SOMEONE_ELSE', label: 'Mostly someone else' },
      { code: 'SOMEONE_ELSE', label: 'Someone else' },
    ];
    return { data };
  }

  listLanguages(input: {
    page: number;
    limit: number;
    search?: string;
  }): PaginatedStaticValuesListResponseDto {
    const q = normalizeSearch(input.search);
    const allCodes = ISO6391.getAllCodes();
    const all: StaticValueDto[] = allCodes
      .map((code) => ({ code, label: ISO6391.getName(code) }))
      .filter((x) => x.label);

    const filtered = q
      ? all.filter(
          (x) => x.label.toLowerCase().includes(q) || x.code.includes(q),
        )
      : all;

    const { skip, take } = pageLimitToSkipTake(input);
    const data = filtered.slice(skip, skip + take);
    const total = filtered.length;
    const totalPages = Math.ceil(total / input.limit);
    return { data, total, page: input.page, limit: input.limit, totalPages };
  }

  listCountries(input: {
    page: number;
    limit: number;
    search?: string;
  }): PaginatedStaticValuesListResponseDto {
    const q = normalizeSearch(input.search);
    const all = this.getAllCountries();
    const filtered = q
      ? all.filter(
          (x) =>
            x.label.toLowerCase().includes(q) || x.code.toLowerCase() === q,
        )
      : all;

    const { skip, take } = pageLimitToSkipTake(input);
    const data = filtered.slice(skip, skip + take);
    const total = filtered.length;
    const totalPages = Math.ceil(total / input.limit);
    return { data, total, page: input.page, limit: input.limit, totalPages };
  }

  listRegions(input: {
    page: number;
    limit: number;
    search?: string;
    countryCode?: string;
  }): PaginatedStaticValuesListResponseDto {
    const q = normalizeSearch(input.search);
    const countryCode = (input.countryCode ?? '').trim().toUpperCase();

    if (!countryCode && !q) {
      throw new BadRequestException(
        'Either countryCode or search must be provided for regions',
      );
    }

    const allRegions = this.getAllRegions();
    const all = countryCode
      ? allRegions.filter((r) => r.meta?.countryCode === countryCode)
      : allRegions;

    const filtered = q
      ? all.filter(
          (x) =>
            x.label.toLowerCase().includes(q) ||
            x.code.toLowerCase().includes(q),
        )
      : all;

    const { skip, take } = pageLimitToSkipTake(input);
    const data = filtered.slice(skip, skip + take);
    const total = filtered.length;
    const totalPages = Math.ceil(total / input.limit);
    return { data, total, page: input.page, limit: input.limit, totalPages };
  }
}
