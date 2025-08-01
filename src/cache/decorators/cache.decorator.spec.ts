import { Cacheable, CacheEvict, CacheKey, CacheTTL } from './cache.decorator';

describe('Cache Decorators', () => {
  describe('@Cacheable', () => {
    it('should create a decorator function', () => {
      const decorator = Cacheable('test-key', 300);
      expect(typeof decorator).toBe('function');
    });

    it('should create a decorator function without TTL', () => {
      const decorator = Cacheable('test-key');
      expect(typeof decorator).toBe('function');
    });
  });

  describe('@CacheEvict', () => {
    it('should create a decorator function', () => {
      const keys = ['key1', 'key2:{id}'];
      const decorator = CacheEvict(keys);
      expect(typeof decorator).toBe('function');
    });
  });

  describe('@CacheKey', () => {
    it('should create a decorator function', () => {
      const decorator = CacheKey('test-key');
      expect(typeof decorator).toBe('function');
    });
  });

  describe('@CacheTTL', () => {
    it('should create a decorator function', () => {
      const decorator = CacheTTL(300);
      expect(typeof decorator).toBe('function');
    });
  });
});
