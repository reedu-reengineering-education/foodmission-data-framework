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
