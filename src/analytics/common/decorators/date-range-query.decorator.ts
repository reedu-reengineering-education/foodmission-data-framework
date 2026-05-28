import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export function DateRangeQuery() {
  return applyDecorators(
    ApiQuery({ name: 'from', required: false, type: String }),
    ApiQuery({ name: 'to', required: false, type: String }),
  );
}
