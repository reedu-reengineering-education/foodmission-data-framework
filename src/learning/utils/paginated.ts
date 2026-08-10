import { PaginatedResponseDto } from '../../common/dto/api-response.dto';

export function toPaginatedResponseDto<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponseDto<T> {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1 && totalPages > 0,
    },
  };
}
