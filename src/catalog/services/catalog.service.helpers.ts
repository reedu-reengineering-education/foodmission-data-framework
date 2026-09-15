import { pageLimitToSkipTake } from '../../common/utils/pagination';
import { CatalogValueDto } from '../dto/catalog-value.dto';
import { PaginatedCatalogListResponseDto } from '../dto/catalog-response.dto';

export type SearchableCatalogItem = {
  code: string;
  label: string;
  canonicalLabel: string;
};

export function titleCaseFromEnum(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Round to `digits` significant figures, e.g. 381 500 -> 380 000. */
export function roundToSignificant(value: number, digits = 2): number {
  if (value === 0) return 0;
  const step = 10 ** (Math.floor(Math.log10(Math.abs(value))) - digits + 1);
  return Math.round(value / step) * step;
}

export function normalizeSearch(s?: string): string | undefined {
  const v = (s ?? '').trim();
  return v.length ? v.toLowerCase() : undefined;
}

export function filterLocalizedItems<T extends SearchableCatalogItem>(
  items: T[],
  search: string | undefined,
  codeMatch: (item: T, query: string) => boolean,
): T[] {
  if (!search) {
    return items;
  }

  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(search) ||
      item.canonicalLabel.toLowerCase().includes(search) ||
      codeMatch(item, search),
  );
}

export function toPaginatedResponse<TItem>(
  input: { page: number; limit: number },
  items: TItem[],
  mapItem: (item: TItem) => CatalogValueDto,
): PaginatedCatalogListResponseDto {
  const { skip, take } = pageLimitToSkipTake(input);
  const data = items.slice(skip, skip + take).map(mapItem);
  const total = items.length;
  const totalPages = Math.ceil(total / input.limit);

  return {
    data,
    total,
    page: input.page,
    limit: input.limit,
    totalPages,
  };
}
