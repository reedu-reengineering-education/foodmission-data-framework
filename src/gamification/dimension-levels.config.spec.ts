import {
  ContentLevel,
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyMeatRange,
  WeeklyReusableRange,
} from '@prisma/client';
import {
  inferDimensionLevel,
  ONBOARDING_FIELD_DIMENSION,
} from './dimension-levels.config';
import { dimensionSeedData } from '../../scripts/seeds/shared/dimensions-topics';

const DIMENSION_CODES = dimensionSeedData.map((d) => d.code);

describe('dimension levels', () => {
  describe('inferDimensionLevel', () => {
    it('uses the mapped answer for its dimension', () => {
      const answers = {
        weeklyMeatConsumption: WeeklyMeatRange.FIFTEEN_PLUS,
        weeklyReusableOrRefill: WeeklyReusableRange.TEN_PLUS,
      };

      expect(
        inferDimensionLevel('DIET_CHANGES', answers, UserSegment.INTERMEDIATE),
      ).toBe(ContentLevel.BEGINNER);
      expect(
        inferDimensionLevel('PACKAGING', answers, UserSegment.INTERMEDIATE),
      ).toBe(ContentLevel.ADVANCED);
    });

    it('maps beef frequency through the ordinal fallback', () => {
      expect(
        inferDimensionLevel(
          'PRODUCT_CHOICES',
          { weeklyBeefConsumption: WeeklyBeefFrequency.NEVER },
          UserSegment.BEGINNER,
        ),
      ).toBe(ContentLevel.ADVANCED);
    });

    it('falls back to the overall segment for an unmapped dimension', () => {
      expect(
        inferDimensionLevel('PRODUCTION_METHODS', {}, UserSegment.INTERMEDIATE),
      ).toBe(ContentLevel.INTERMEDIATE);
    });

    it('falls back to the overall segment when the answer is missing', () => {
      expect(
        inferDimensionLevel('DIET_CHANGES', {}, UserSegment.ADVANCED),
      ).toBe(ContentLevel.ADVANCED);
    });
  });

  it('only maps to dimensions that exist in the catalog', () => {
    for (const code of Object.values(ONBOARDING_FIELD_DIMENSION)) {
      expect(DIMENSION_CODES).toContain(code);
    }
  });
});
