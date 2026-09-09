import { ProgressIndicatorKind } from '@prisma/client';
import { SustainabilityWheelKind } from './progress-wheels.config';

/** Amount added to each wheel's accumulatedValue when the action is recorded. */
export type WheelImpactDeltas = Partial<
  Record<SustainabilityWheelKind, number>
>;

export interface WheelImpactAction {
  code: string;
  label: string;
  impact: WheelImpactDeltas;
}

/**
 * Catalog of validated actions and their impact on the 4 sustainability
 * wheels. First draft: only the one example action product supplied
 * (vegetarian serving). More actions get added here as their impact values
 * are provided — the recording mechanism (ProgressWheelService.recordImpact)
 * doesn't change when new entries are added.
 */
export const WHEEL_IMPACT_ACTIONS = {
  VEGETARIAN_SERVING_100G: {
    code: 'VEGETARIAN_SERVING_100G',
    label: 'Vegetarian serving (100 g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.6,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 0.4,
      [ProgressIndicatorKind.WATER_SAVINGS]: 10,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.3,
    } satisfies WheelImpactDeltas,
  },
  VEGAN_SERVING_100G: {
    code: 'VEGAN_SERVING_100G',
    label: 'Vegan serving (100 g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.8,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 0.4,
      [ProgressIndicatorKind.WATER_SAVINGS]: 10,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.3,
    } satisfies WheelImpactDeltas,
  },
  BEEF_TO_PORK_100G: {
    code: 'BEEF_TO_PORK_100G',
    label: 'Beef → Pork (100 g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 2.0,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 0.7,
      [ProgressIndicatorKind.WATER_SAVINGS]: 20,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 2.7,
    } satisfies WheelImpactDeltas,
  },
  BEEF_TO_CHICKEN_100G: {
    code: 'BEEF_TO_CHICKEN_100G',
    label: 'Beef → Chicken (100 g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 2.6,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 0.4,
      [ProgressIndicatorKind.WATER_SAVINGS]: 44,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 2.9,
    } satisfies WheelImpactDeltas,
  },
  BEEF_TO_LEGUMES_100G: {
    code: 'BEEF_TO_LEGUMES_100G',
    label: 'Beef → Legumes (100 g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 3.0,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 1.9,
      [ProgressIndicatorKind.WATER_SAVINGS]: 50,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 3.3,
    } satisfies WheelImpactDeltas,
  },
  PORK_TO_CHICKEN_100G: {
    code: 'PORK_TO_CHICKEN_100G',
    label: 'Pork → Chicken (100 g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.6,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 1.1,
      [ProgressIndicatorKind.WATER_SAVINGS]: 24,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.2,
    } satisfies WheelImpactDeltas,
  },
  PORK_TO_LEGUMES_100G: {
    code: 'PORK_TO_LEGUMES_100G',
    label: 'Pork → Legumes (100 g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.9,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 2.6,
      [ProgressIndicatorKind.WATER_SAVINGS]: 30,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.6,
    } satisfies WheelImpactDeltas,
  },
  CHICKEN_TO_LEGUMES_100G: {
    code: 'CHICKEN_TO_LEGUMES_100G',
    label: 'Chicken → Legumes (100 g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.3,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 1.5,
      [ProgressIndicatorKind.WATER_SAVINGS]: 6,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.4,
    } satisfies WheelImpactDeltas,
  },
  HALF_PLATE_SAVED: {
    code: 'HALF_PLATE_SAVED',
    label: 'Half Plate Saved (50g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.15,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 0.2,
      [ProgressIndicatorKind.WATER_SAVINGS]: 8,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.2,
    } satisfies WheelImpactDeltas,
  },
  FULL_PLATE_SAVED: {
    code: 'FULL_PLATE_SAVED',
    label: 'Full Plate Saved (100g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.3,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 0.4,
      [ProgressIndicatorKind.WATER_SAVINGS]: 15,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.4,
    } satisfies WheelImpactDeltas,
  },
  EXPIRED_PRODUCT_CONSUMED: {
    code: 'EXPIRED_PRODUCT_CONSUMED',
    label: 'Expired Product Consumed',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.3,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 0.4,
      [ProgressIndicatorKind.WATER_SAVINGS]: 15,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.4,
    } satisfies WheelImpactDeltas,
  },
  SNACK_TO_FRUIT_OR_NUTS_30G: {
    code: 'SNACK_TO_FRUIT_OR_NUTS_30G',
    label: 'Snack → Fruit or Nuts (30 g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.1,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 0.1,
      [ProgressIndicatorKind.WATER_SAVINGS]: 5,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.05,
    } satisfies WheelImpactDeltas,
  },
  SUGARY_CEREAL_TO_OATS_FRUIT_30G: {
    code: 'SUGARY_CEREAL_TO_OATS_FRUIT_30G',
    label: 'Sugary Cereal → Oats/Fruit (30 g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.1,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 0.1,
      [ProgressIndicatorKind.WATER_SAVINGS]: 5,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.05,
    } satisfies WheelImpactDeltas,
  },
  SUGARY_DRINK_TO_WATER_250ML: {
    code: 'SUGARY_DRINK_TO_WATER_250ML',
    label: 'Sugary Drink → Water (250 ml)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.1,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 0.1,
      [ProgressIndicatorKind.WATER_SAVINGS]: 3,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.01,
    } satisfies WheelImpactDeltas,
  },
  READY_MEAL_TO_HOME_COOKED_400G: {
    code: 'READY_MEAL_TO_HOME_COOKED_400G',
    label: 'Ready Meal → Home-Cooked Meal (400 g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.6,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 1.0,
      [ProgressIndicatorKind.WATER_SAVINGS]: 50,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.5,
    } satisfies WheelImpactDeltas,
  },
  PROCESSED_MEAT_TO_LEGUMES_50G: {
    code: 'PROCESSED_MEAT_TO_LEGUMES_50G',
    label: 'Processed Meat → Legumes (50 g)',
    impact: {
      [ProgressIndicatorKind.CO2_REDUCTION]: 0.4,
      [ProgressIndicatorKind.ENERGY_REDUCTION]: 0.5,
      [ProgressIndicatorKind.WATER_SAVINGS]: 25,
      [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0.3,
    } satisfies WheelImpactDeltas,
  },

  // Add new actions here as their impact values are supplied, e.g.:
  // SOME_NEW_ACTION_CODE: {
  //   code: 'SOME_NEW_ACTION_CODE',
  //   label: 'Human-readable label',
  //   impact: {
  //     [ProgressIndicatorKind.CO2_REDUCTION]: 0,
  //     [ProgressIndicatorKind.ENERGY_REDUCTION]: 0,
  //     [ProgressIndicatorKind.WATER_SAVINGS]: 0,
  //     [ProgressIndicatorKind.LAND_USE_REDUCTION]: 0,
  //   } satisfies WheelImpactDeltas,
  // },
} satisfies Record<string, WheelImpactAction>;

export type WheelImpactActionCode = keyof typeof WHEEL_IMPACT_ACTIONS;

export function getWheelImpactAction(code: string): WheelImpactAction {
  const action = (WHEEL_IMPACT_ACTIONS as Record<string, WheelImpactAction>)[
    code
  ];
  if (!action) {
    throw new Error(`Unknown wheel impact action: ${code}`);
  }
  return action;
}
