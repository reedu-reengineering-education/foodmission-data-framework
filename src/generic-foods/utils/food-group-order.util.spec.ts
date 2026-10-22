import {
  FOOD_GROUP_ORDER,
  sortByFoodGroupOrder,
} from './food-group-order.util';

describe('sortByFoodGroupOrder', () => {
  it('orders known groups by curated rank', () => {
    const result = sortByFoodGroupOrder([
      { slug: 'alcoholic-beverages' },
      { slug: 'fruits' },
      { slug: 'vegetables' },
    ]);

    expect(result.map((g) => g.slug)).toEqual([
      'vegetables',
      'fruits',
      'alcoholic-beverages',
    ]);
  });

  it('appends unknown groups after known ones in input order', () => {
    const result = sortByFoodGroupOrder([
      { slug: 'zzz-new' },
      { slug: 'aaa-new' },
      { slug: 'miscellaneous-foods' },
    ]);

    expect(result.map((g) => g.slug)).toEqual([
      'miscellaneous-foods',
      'zzz-new',
      'aaa-new',
    ]);
  });

  it('has no duplicate slugs', () => {
    expect(new Set(FOOD_GROUP_ORDER).size).toBe(FOOD_GROUP_ORDER.length);
  });
});
