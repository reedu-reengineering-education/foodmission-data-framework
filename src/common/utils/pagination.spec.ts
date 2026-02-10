import { normalizePagination } from './pagination';

describe('normalizePagination', () => {
  it('returns provided positive skip/take', () => {
    const result = normalizePagination(5, 20);
    expect(result).toEqual({ skip: 5, take: 20 });
  });

  it('defaults take when zero or negative', () => {
    const result = normalizePagination(5, 0);
    expect(result).toEqual({ skip: 5, take: 10 });
  });

  it('preserves zero skip even with non-zero defaults', () => {
    const result = normalizePagination(0, 5, { skip: 2, take: 15 });
    expect(result).toEqual({ skip: 0, take: 5 });
  });

  it('defaults skip when negative', () => {
    const result = normalizePagination(-5, 5);
    expect(result).toEqual({ skip: 0, take: 5 });
  });

  it('uses custom defaults when provided', () => {
    const result = normalizePagination(undefined, undefined, {
      skip: 2,
      take: 15,
    });
    expect(result).toEqual({ skip: 2, take: 15 });
  });
});
