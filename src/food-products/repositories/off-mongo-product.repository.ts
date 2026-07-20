import { Injectable } from '@nestjs/common';
import { OffMongoPrismaService } from '../../database/off-mongo-prisma.service';
import { OffProduct, Prisma } from '.prisma/off-mongo-client';
import { OpenFoodFactsSearchOptions } from '../interfaces/openfoodfacts.interface';

export interface OffMongoSearchResult {
  items: OffProduct[];
  totalCount: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class OffMongoProductRepository {
  constructor(private readonly prisma: OffMongoPrismaService) {}

  get isAvailable(): boolean {
    return this.prisma.isConfigured;
  }

  findByBarcode(barcode: string) {
    return this.prisma.offProduct.findUnique({ where: { id: barcode } });
  }

  // Uses findRaw/aggregateRaw instead of Prisma's regular query builder.
  // Prisma's mongodb connector compiles a where clause combining an array
  // filter (keywords hasEvery) with a scalar filter (product_name not null)
  // into an aggregation $expr, which MongoDB cannot match against the
  // _keywords index (falls back to a full IXSCAN on _id / collection scan).
  // Raw commands send a plain filter document, which lets Mongo use the
  // existing _keywords_1_* indexes.
  async search(
    options: OpenFoodFactsSearchOptions,
  ): Promise<OffMongoSearchResult> {
    const filter = this.buildRawFilter(options);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const sort = this.buildRawSort(options.sortBy);

    const findOptions: Record<string, unknown> = {
      skip: (page - 1) * pageSize,
      limit: pageSize,
    };
    if (sort) {
      findOptions.sort = sort;
    }

    const [rawItems, countResult] = await Promise.all([
      this.prisma.offProduct.findRaw({
        filter: filter as Prisma.InputJsonValue,
        options: findOptions as Prisma.InputJsonValue,
      }),
      this.prisma.offProduct.aggregateRaw({
        pipeline: [
          { $match: filter },
          { $count: 'count' },
        ] as Prisma.InputJsonValue[],
      }),
    ]);

    const items = (rawItems as unknown as Record<string, unknown>[]).map(
      (doc) => ({ ...doc, id: doc._id }) as unknown as OffProduct,
    );

    const countRows = countResult as unknown as { count: number }[];
    const totalCount = countRows[0]?.count ?? 0;

    return { items, totalCount, page, pageSize };
  }

  private buildRawFilter(
    options: OpenFoodFactsSearchOptions,
  ): Record<string, unknown> {
    const and: Record<string, unknown>[] = [];

    if (options.query) {
      const words = options.query
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 0);
      if (words.length > 0) {
        and.push({ _keywords: { $all: words } });
      }
    }

    if (options.categories && options.categories.length > 0) {
      and.push({ categories_tags: { $in: options.categories } });
    }

    if (options.brands && options.brands.length > 0) {
      and.push({ brands_tags: { $in: options.brands } });
    }

    if (options.countries && options.countries.length > 0) {
      and.push({ countries_tags: { $in: options.countries } });
    }

    const filter: Record<string, unknown> = { product_name: { $ne: null } };
    if (and.length > 0) {
      filter.$and = and;
    }

    return filter;
  }

  private buildRawSort(
    sortBy?: OpenFoodFactsSearchOptions['sortBy'],
  ): Record<string, 1 | -1> | undefined {
    switch (sortBy) {
      case 'created_t':
        return { created_t: -1 };
      case 'last_modified_t':
        return { last_modified_t: -1 };
      case 'completeness':
        return { completeness: -1 };
      case 'popularity':
        return { unique_scans_n: -1 };
      case 'product_name':
        return { product_name: 1 };
      default:
        return undefined;
    }
  }
}
