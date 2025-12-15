import 'reflect-metadata';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import {
  ApiOpenFoodFactsSearchQuery,
  ApiPaginationQuery,
} from './api-query-params.decorator';

describe('ApiQueryParamsDecorators', () => {
  const getQueryMetadata = (target: any, method: string) =>
    Reflect.getMetadata(DECORATORS.API_PARAMETERS, target[method]) || [];

  describe('ApiOpenFoodFactsSearchQuery', () => {
    it('should register all expected query params with correct types', () => {
      class TestController {
        @ApiOpenFoodFactsSearchQuery()
        handler() {}
      }

      const metadata = getQueryMetadata(
        TestController.prototype,
        'handler',
      ).filter((m: any) => m.in === 'query');
      const names = metadata.map((m: any) => m.name);

      expect(new Set(names)).toEqual(
        new Set(['query', 'category', 'brand', 'page', 'pageSize', 'limit']),
      );

      expect(metadata.find((m: any) => m.name === 'query')?.type).toBe(String);
      expect(metadata.find((m: any) => m.name === 'category')?.type).toBe(
        String,
      );
      expect(metadata.find((m: any) => m.name === 'brand')?.type).toBe(String);
      expect(metadata.find((m: any) => m.name === 'page')?.type).toBe(Number);
      expect(metadata.find((m: any) => m.name === 'pageSize')?.type).toBe(
        Number,
      );
      expect(metadata.find((m: any) => m.name === 'limit')?.type).toBe(Number);
    });
  });

  describe('ApiPaginationQuery', () => {
    it('should include page and limit by default, without pageSize', () => {
      class TestController {
        @ApiPaginationQuery()
        handler() {}
      }

      const metadata = getQueryMetadata(
        TestController.prototype,
        'handler',
      ).filter((m: any) => m.in === 'query');
      const names = metadata.map((m: any) => m.name);

      expect(new Set(names)).toEqual(new Set(['page', 'limit']));
    });

    it('should include pageSize when requested and omit limit when disabled', () => {
      class TestController {
        @ApiPaginationQuery({
          includePage: true,
          includePageSize: true,
          includeLimit: false,
          pageSizeDefault: 25,
          pageSizeMax: 200,
        })
        handler() {}
      }

      const metadata = getQueryMetadata(
        TestController.prototype,
        'handler',
      ).filter((m: any) => m.in === 'query');
      const names = metadata.map((m: any) => m.name);

      expect(new Set(names)).toEqual(new Set(['page', 'pageSize']));
      const pageSizeMeta = metadata.find((m: any) => m.name === 'pageSize');
      expect(pageSizeMeta?.description).toContain('25');
      expect(pageSizeMeta?.description).toContain('200');
    });

    it('should include limit when requested and reflect custom defaults', () => {
      class TestController {
        @ApiPaginationQuery({
          includePage: true,
          includePageSize: false,
          includeLimit: true,
          limitDefault: 5,
          limitMax: 20,
        })
        handler() {}
      }

      const metadata = getQueryMetadata(
        TestController.prototype,
        'handler',
      ).filter((m: any) => m.in === 'query');
      const names = metadata.map((m: any) => m.name);

      expect(new Set(names)).toEqual(new Set(['page', 'limit']));
      const limitMeta = metadata.find((m: any) => m.name === 'limit');
      expect(limitMeta?.description).toContain('5');
      expect(limitMeta?.description).toContain('20');
    });
  });
});
