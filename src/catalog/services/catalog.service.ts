import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ActivityLevel,
  AnnualIncomeLevel,
  EducationLevel,
  Gender,
  GroupRole,
  MealCategory,
  MealCourse,
  TypeOfMeal,
  Unit,
} from '@prisma/client';
import ISO6391 from 'iso-639-1';
import iso3166 from 'iso-3166-2';
import { pageLimitToSkipTake } from '../../common/utils/pagination';
import { CatalogValueDto } from '../dto/catalog-value.dto';
import {
  CatalogListResponseDto,
  CatalogStartupResponseDto,
  PaginatedCatalogListResponseDto,
} from '../dto/catalog-response.dto';

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
export class CatalogService {
  private cached: {
    countries?: CatalogValueDto[];
    regionsAll?: CatalogValueDto[];
  } = {};

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
    return {
      data: Object.values(Gender).map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listActivityLevels(): CatalogListResponseDto {
    return {
      data: Object.values(ActivityLevel).map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listEducationLevels(): CatalogListResponseDto {
    return {
      data: Object.values(EducationLevel).map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listAnnualIncomeLevels(): CatalogListResponseDto {
    return {
      data: Object.values(AnnualIncomeLevel).map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listUnits(): CatalogListResponseDto {
    return {
      data: Object.values(Unit).map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listTypeOfMeals(): CatalogListResponseDto {
    return {
      data: Object.values(TypeOfMeal).map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listMealCategories(): CatalogListResponseDto {
    return {
      data: Object.values(MealCategory).map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listMealCourses(): CatalogListResponseDto {
    return {
      data: Object.values(MealCourse).map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listGroupRoles(): CatalogListResponseDto {
    return {
      data: Object.values(GroupRole).map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listDietaryPreferences(): CatalogListResponseDto {
    const values = [
      'VEGAN',
      'VEGETARIAN',
      'PESCATARIAN',
      'GLUTEN_FREE',
      'DAIRY_FREE',
      'NUT_FREE',
      'HALAL',
      'KOSHER',
    ];
    return {
      data: values.map((code) => ({
        code,
        label: titleCaseFromEnum(code),
      })),
    };
  }

  listShoppingResponsibilities(): CatalogListResponseDto {
    const data: CatalogValueDto[] = [
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
  }): PaginatedCatalogListResponseDto {
    const q = normalizeSearch(input.search);
    const allCodes = ISO6391.getAllCodes();
    const all: CatalogValueDto[] = allCodes
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
  }): PaginatedCatalogListResponseDto {
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
  }): PaginatedCatalogListResponseDto {
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
