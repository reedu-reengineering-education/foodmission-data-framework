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
