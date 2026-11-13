import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import {
  ENTITY_TRANSLATABLE_FIELDS,
  isTranslatableEntityType,
  isValidFieldForEntity,
  type TranslatableEntityType,
} from '../entity-types';

export type FieldFallbacks = Record<string, string | null | undefined>;

export type TranslationValueMatch = 'contains' | 'equals';

@Injectable()
export class TranslationService {
  constructor(private readonly prisma: PrismaService) {}

  resolveLocale(lang?: string): string {
    const candidate = (lang ?? DEFAULT_LOCALE).trim().toLowerCase();
    if ((SUPPORTED_LOCALES as readonly string[]).includes(candidate)) {
      return candidate;
    }
    return DEFAULT_LOCALE;
  }

  private assertEntityAndFields(
    entityType: string,
    fields: string[],
  ): asserts entityType is TranslatableEntityType {
    if (!isTranslatableEntityType(entityType)) {
      throw new BadRequestException(
        `Unsupported translation entityType: ${entityType}`,
      );
    }
    for (const field of fields) {
      if (!isValidFieldForEntity(entityType, field)) {
        throw new BadRequestException(
          `Field '${field}' is not translatable for ${entityType}`,
        );
      }
    }
  }

  /**
   * Resolve translated fields for one entity. Falls back to English values
   * when locale is en or a translation row is missing.
   */
  async resolve(
    entityType: TranslatableEntityType,
    entityId: string,
    locale: string,
    fields: string[],
    fallbacks: FieldFallbacks,
  ): Promise<Record<string, string | null>> {
    this.assertEntityAndFields(entityType, fields);
    const resolvedLocale = this.resolveLocale(locale);

    const result: Record<string, string | null> = {};
    for (const field of fields) {
      const fallback = fallbacks[field];
      result[field] = fallback == null || fallback === '' ? null : fallback;
    }

    if (resolvedLocale === DEFAULT_LOCALE) {
      return result;
    }

    const rows = await this.prisma.entityTranslation.findMany({
      where: {
        entityType,
        entityId,
        locale: resolvedLocale,
        field: { in: fields },
      },
    });

    for (const row of rows) {
      if (row.value.trim() !== '') {
        result[row.field] = row.value;
      }
    }

    return result;
  }

  /**
   * Batch-resolve translations for list endpoints (one DB query).
   */
  async resolveMany(
    entityType: TranslatableEntityType,
    entityIds: string[],
    locale: string,
    fields: string[],
    fallbackById: Record<string, FieldFallbacks>,
  ): Promise<Record<string, Record<string, string | null>>> {
    this.assertEntityAndFields(entityType, fields);
    const resolvedLocale = this.resolveLocale(locale);

    const output: Record<string, Record<string, string | null>> = {};
    for (const id of entityIds) {
      const fallbacks = fallbackById[id] ?? {};
      output[id] = {};
      for (const field of fields) {
        const fallback = fallbacks[field];
        output[id][field] =
          fallback == null || fallback === '' ? null : fallback;
      }
    }

    if (resolvedLocale === DEFAULT_LOCALE || entityIds.length === 0) {
      return output;
    }

    const rows = await this.prisma.entityTranslation.findMany({
      where: {
        entityType,
        entityId: { in: entityIds },
        locale: resolvedLocale,
        field: { in: fields },
      },
    });

    for (const row of rows) {
      if (!output[row.entityId]) continue;
      if (row.value.trim() !== '') {
        output[row.entityId][row.field] = row.value;
      }
    }

    return output;
  }

  /**
   * Find entity IDs whose translated field values match (case-insensitive).
   * Use `contains` for free-text search; `equals` for exact filters (e.g. foodGroup).
   */
  async findEntityIdsByValue(
    entityType: TranslatableEntityType,
    locale: string,
    fields: string[],
    search: string,
    match: TranslationValueMatch = 'contains',
  ): Promise<string[]> {
    this.assertEntityAndFields(entityType, fields);
    const resolvedLocale = this.resolveLocale(locale);
    if (resolvedLocale === DEFAULT_LOCALE || !search.trim()) {
      return [];
    }

    const valueFilter =
      match === 'equals'
        ? { equals: search, mode: 'insensitive' as const }
        : { contains: search, mode: 'insensitive' as const };

    const rows = await this.prisma.entityTranslation.findMany({
      where: {
        entityType,
        locale: resolvedLocale,
        field: { in: fields },
        value: valueFilter,
      },
      select: { entityId: true },
      distinct: ['entityId'],
    });

    return rows.map((r) => r.entityId);
  }

  async listDistinct(
    entityType: TranslatableEntityType,
    locale: string,
    field: string,
    search?: string,
  ): Promise<string[]> {
    this.assertEntityAndFields(entityType, [field]);
    const resolvedLocale = this.resolveLocale(locale);
    if (resolvedLocale === DEFAULT_LOCALE) {
      return [];
    }

    const where: {
      entityType: string;
      locale: string;
      field: string;
      value?: { contains: string; mode: 'insensitive' };
    } = {
      entityType,
      locale: resolvedLocale,
      field,
    };

    if (search?.trim()) {
      where.value = { contains: search.trim(), mode: 'insensitive' };
    }

    const rows = await this.prisma.entityTranslation.findMany({
      where,
      select: { value: true },
      distinct: ['value'],
      orderBy: { value: 'asc' },
    });

    return rows.map((r) => r.value).filter((v) => v.trim() !== '');
  }

  async deleteForEntity(
    entityType: TranslatableEntityType,
    entityId: string,
  ): Promise<void> {
    await this.prisma.entityTranslation.deleteMany({
      where: { entityType, entityId },
    });
  }

  /** Fields registered for an entity type (for tooling / validation). */
  getFieldsForEntity(entityType: TranslatableEntityType): readonly string[] {
    return ENTITY_TRANSLATABLE_FIELDS[entityType];
  }
}
