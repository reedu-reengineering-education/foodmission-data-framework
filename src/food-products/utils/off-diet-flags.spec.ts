import { parseOffDietFlags } from './off-diet-flags';

describe('parseOffDietFlags', () => {
  it('maps definite analysis tags to booleans', () => {
    expect(
      parseOffDietFlags(['en:palm-oil-free', 'en:vegan', 'en:vegetarian']),
    ).toEqual({ isVegan: true, isVegetarian: true, isPalmOilFree: true });

    expect(
      parseOffDietFlags(['en:palm-oil', 'en:non-vegan', 'en:non-vegetarian']),
    ).toEqual({ isVegan: false, isVegetarian: false, isPalmOilFree: false });
  });

  it('maps maybe/unknown tags to null', () => {
    expect(
      parseOffDietFlags([
        'en:palm-oil-content-unknown',
        'en:maybe-vegan',
        'en:vegetarian-status-unknown',
      ]),
    ).toEqual({ isVegan: null, isVegetarian: null, isPalmOilFree: null });
  });

  it('returns all null for missing or malformed input', () => {
    const empty = { isVegan: null, isVegetarian: null, isPalmOilFree: null };
    expect(parseOffDietFlags(undefined)).toEqual(empty);
    expect(parseOffDietFlags('en:vegan')).toEqual(empty);
  });

  it('lets certified labels override the analysis', () => {
    expect(
      parseOffDietFlags(['en:maybe-vegan', 'en:non-vegetarian'], ['en:vegan']),
    ).toMatchObject({ isVegan: true, isVegetarian: true });

    expect(
      parseOffDietFlags(['en:vegetarian-status-unknown'], ['en:vegetarian']),
    ).toMatchObject({ isVegan: null, isVegetarian: true });
  });

  it('treats vegan as implying vegetarian', () => {
    expect(parseOffDietFlags(['en:vegan'])).toMatchObject({
      isVegan: true,
      isVegetarian: true,
    });
  });
});
