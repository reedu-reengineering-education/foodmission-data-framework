import { BadRequestException, Injectable } from '@nestjs/common';
import ISO6391 from 'iso-639-1';
import { Country, State } from 'country-state-city';
import { pageLimitToSkipTake } from '../../common/utils/pagination';
import { StaticValueDto } from '../dto/static-value.dto';
import {
  PaginatedStaticValuesListResponseDto,
  StaticValuesListResponseDto,
} from '../dto/static-values-response.dto';

// Keep in sync with prisma/schema.prisma enums.
const GENDERS = [
  'MALE',
  'FEMALE',
  'OTHER',
  'UNSPECIFIED',
  'PREFER_NOT_TO_SAY',
] as const;
const ACTIVITY_LEVELS = [
  'SEDENTARY',
  'LIGHT',
  'MODERATE',
  'ACTIVE',
  'VERY_ACTIVE',
] as const;
const ANNUAL_INCOME_LEVELS = [
  'BELOW_10000',
  'FROM_10000_TO_19999',
  'FROM_20000_TO_34999',
  'FROM_35000_TO_49999',
  'FROM_50000_TO_74999',
  'FROM_75000_TO_99999',
  'ABOVE_100000',
] as const;
const EDUCATION_LEVELS = [
  'NO_FORMAL_EDUCATION',
  'PRIMARY',
  'SECONDARY',
  'VOCATIONAL',
  'BACHELORS',
  'MASTERS',
  'DOCTORATE',
] as const;
const UNITS = ['PIECES', 'G', 'KG', 'ML', 'L', 'CUPS'] as const;
const TYPE_OF_MEALS = [
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'SNACK',
  'SPECIAL_DRINKS',
] as const;
const MEAL_TYPES = ['SALAD', 'MEAT', 'PASTA', 'RICE', 'VEGAN'] as const;
const GROUP_ROLES = ['ADMIN', 'MEMBER'] as const;

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
    const all: StaticValueDto[] = Country.getAllCountries().map((c) => ({
      code: c.isoCode,
      label: c.name,
    }));
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

    const states = countryCode
      ? State.getStatesOfCountry(countryCode)
      : State.getAllStates();

    const all: StaticValueDto[] = states.map((s) => ({
      code: `${s.countryCode}-${s.isoCode}`,
      label: s.name,
      meta: { countryCode: s.countryCode },
    }));

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
