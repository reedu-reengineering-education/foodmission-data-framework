import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export interface ApiPaginationQueryOptions {
  includePage?: boolean;
  includePageSize?: boolean;
  includeLimit?: boolean;
  pageSizeMax?: number;
  limitMax?: number;
  pageSizeDefault?: number;
  limitDefault?: number;
}

export function ApiPaginationQuery(options: ApiPaginationQueryOptions = {}) {
  const {
    includePage = true,
    includePageSize = false,
    includeLimit = true,
    pageSizeMax = 50,
    limitMax = 100,
    pageSizeDefault = 10,
    limitDefault = 10,
  } = options;

  const decorators: Array<ReturnType<typeof ApiQuery>> = [];

  if (includePage) {
    decorators.push(
      ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: `Page number (default: 1, min: 1)`,
      }),
    );
  }

  if (includePageSize) {
    decorators.push(
      ApiQuery({
        name: 'pageSize',
        required: false,
        type: Number,
        description: `Items per page (default: ${pageSizeDefault}, min: 1, max: ${pageSizeMax})`,
      }),
    );
  }

  if (includeLimit) {
    decorators.push(
      ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: `Items per page (default: ${limitDefault}, min: 1, max: ${limitMax})`,
      }),
    );
  }

  return applyDecorators(...decorators);
}

export function ApiOpenFoodFactsSearchQuery() {
  return applyDecorators(
    ApiQuery({
      name: 'query',
      required: false,
      type: String,
      description: 'Search query string (name, category, or brand)',
    }),
    ApiQuery({
      name: 'category',
      required: false,
      type: String,
      description: 'Filter by category',
    }),
    ApiQuery({
      name: 'brand',
      required: false,
      type: String,
      description: 'Filter by brand',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (default: 1, min: 1)',
    }),
    ApiQuery({
      name: 'pageSize',
      required: false,
      type: Number,
      description:
        'Items per page (default: 10, min: 1, max: 50). Can also use limit parameter for backward compatibility.',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description:
        'Items per page (alternative to pageSize, for backward compatibility, min: 1, max: 50)',
    }),
  );
}
