import {
  ApiOpenFoodFactsSearchQuery,
  ApiPaginationQuery,
} from './api-query-params.decorator';

describe('ApiQueryParamsDecorators', () => {
  describe('ApiOpenFoodFactsSearchQuery', () => {
    it('should be a function', () => {
      expect(typeof ApiOpenFoodFactsSearchQuery).toBe('function');
    });

    it('should return a decorator', () => {
      const decorator = ApiOpenFoodFactsSearchQuery();
      expect(decorator).toBeDefined();
    });
  });

  describe('ApiPaginationQuery', () => {
    it('should be a function', () => {
      expect(typeof ApiPaginationQuery).toBe('function');
    });

    it('should return a decorator with default options', () => {
      const decorator = ApiPaginationQuery();
      expect(decorator).toBeDefined();
    });

    it('should return a decorator with custom options', () => {
      const decorator = ApiPaginationQuery({
        includePage: true,
        includePageSize: true,
        includeLimit: false,
        pageSizeMax: 100,
      });
      expect(decorator).toBeDefined();
    });

    it('should return a decorator with only limit when pageSize is disabled', () => {
      const decorator = ApiPaginationQuery({
        includePage: true,
        includePageSize: false,
        includeLimit: true,
      });
      expect(decorator).toBeDefined();
    });
  });
});
