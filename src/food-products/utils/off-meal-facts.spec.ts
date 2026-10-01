import { isCertifiedLabel, offCategoryFacts } from './off-meal-facts';

describe('offCategoryFacts', () => {
  it('recognises meat and fish parents', () => {
    expect(offCategoryFacts(['en:meats', 'en:prepared-meats']).meat).toBe(true);
    expect(offCategoryFacts(['en:seafood']).meat).toBe(true);
    expect(
      offCategoryFacts(['en:meat-alternatives', 'en:vegetarian-sausages']).meat,
    ).toBe(false);
  });

  it('counts pulses, peas, beans, peanuts and tofu as legumes but not soy drinks', () => {
    expect(offCategoryFacts(['en:legumes', 'en:lentils']).legume).toBe(true);
    expect(offCategoryFacts(['xx:tofu']).legume).toBe(true);
    expect(offCategoryFacts(['en:legumes', 'en:snow-peas']).legume).toBe(true);
    expect(offCategoryFacts(['en:green-beans']).legume).toBe(true);
    expect(offCategoryFacts(['en:peanut-butters']).legume).toBe(true);
    expect(
      offCategoryFacts(['en:legumes-and-their-products', 'en:soy-milks'])
        .legume,
    ).toBe(false);
  });

  it('recognises ancient grains', () => {
    expect(offCategoryFacts(['en:quinoa']).ancientGrain).toBe(true);
    expect(offCategoryFacts(['en:rices']).ancientGrain).toBe(false);
  });
});

describe('isCertifiedLabel', () => {
  it.each([
    'en:organic',
    'en:eu-organic',
    'en:usda-organic',
    'en:soil-association-organic',
    'en:fr-bio-01',
    'en:de-oko-007',
    'en:naturland',
    'fr:ab-agriculture-biologique',
    'en:fair-trade',
    'en:fairtrade-international',
    'en:fairtrade-cocoa',
    'en:rainforest-alliance',
    'en:sustainable-seafood-msc',
    'de:msc-c-50086',
    'en:responsible-aquaculture-asc',
    'en:pdo',
    'en:pdo-arroz-de-valencia',
    'en:pgi',
    'en:tsg',
  ])('accepts %s', (label) => {
    expect(isCertifiedLabel(label)).toBe(true);
  });

  it.each([
    'en:fsc',
    'en:fsc-mix',
    'en:green-dot',
    'fr:triman',
    'en:sustainable',
    'en:vegan',
    'en:no-gluten',
    'en:eu-agriculture',
  ])('rejects %s', (label) => {
    expect(isCertifiedLabel(label)).toBe(false);
  });
});
