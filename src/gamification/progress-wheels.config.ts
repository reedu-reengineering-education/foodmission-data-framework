import { ProgressIndicatorKind, UserSegment } from '@prisma/client';

/**
 * The four sustainability progress wheels. Each wheel visualizes the
 * environmental impact a user has generated through completed actions.
 */
export type SustainabilityWheelKind =
  | typeof ProgressIndicatorKind.CO2_REDUCTION
  | typeof ProgressIndicatorKind.ENERGY_REDUCTION
  | typeof ProgressIndicatorKind.WATER_SAVINGS
  | typeof ProgressIndicatorKind.LAND_USE_REDUCTION;

export const SUSTAINABILITY_WHEEL_KINDS: readonly SustainabilityWheelKind[] = [
  ProgressIndicatorKind.CO2_REDUCTION,
  ProgressIndicatorKind.ENERGY_REDUCTION,
  ProgressIndicatorKind.WATER_SAVINGS,
  ProgressIndicatorKind.LAND_USE_REDUCTION,
];

/** Every wheel/profile combination has exactly 5 stages. */
export const STAGES_PER_PROFILE = 5;

export type StageTargets = readonly [number, number, number, number, number];

export interface SustainabilityWheelDefinition {
  kind: SustainabilityWheelKind;
  label: string;
  /** Short unit label for display (e.g. next to the accumulated value). */
  unit: string;
  /** What the wheel measures, in the language of the product spec. */
  measures: string;
}

export const SUSTAINABILITY_WHEEL_DEFINITIONS: Record<
  SustainabilityWheelKind,
  SustainabilityWheelDefinition
> = {
  [ProgressIndicatorKind.CO2_REDUCTION]: {
    kind: ProgressIndicatorKind.CO2_REDUCTION,
    label: 'CO₂ Reduction',
    unit: 'kg CO2e',
    measures: 'kg CO2e avoided',
  },
  [ProgressIndicatorKind.ENERGY_REDUCTION]: {
    kind: ProgressIndicatorKind.ENERGY_REDUCTION,
    label: 'Energy Reduction',
    unit: 'kWh',
    measures: 'kWh saved',
  },
  [ProgressIndicatorKind.WATER_SAVINGS]: {
    kind: ProgressIndicatorKind.WATER_SAVINGS,
    label: 'Water Savings',
    unit: 'L',
    measures: 'L blue water saved',
  },
  [ProgressIndicatorKind.LAND_USE_REDUCTION]: {
    kind: ProgressIndicatorKind.LAND_USE_REDUCTION,
    label: 'Land Use Reduction',
    unit: 'm2',
    measures: 'm2 land preserved',
  },
};

/**
 * Per-stage goal targets (cumulative amount needed to complete that stage),
 * by wheel kind and user profile.
 *
 * TODO(progress-wheels): placeholder values. The 4 wheels x 3 profiles x 5
 * stages structure is final; the numbers below are illustrative only and
 * must be replaced with the real thresholds from the sustainability-wheel
 * design tables before this goes live.
 */
export const SUSTAINABILITY_WHEEL_STAGE_TARGETS: Record<
  SustainabilityWheelKind,
  Record<UserSegment, StageTargets>
> = {
  [ProgressIndicatorKind.CO2_REDUCTION]: {
    [UserSegment.BEGINNER]: [5, 10, 15, 20, 25],
    [UserSegment.INTERMEDIATE]: [15, 25, 35, 45, 55],
    [UserSegment.ADVANCED]: [30, 45, 60, 75, 90],
  },
  [ProgressIndicatorKind.ENERGY_REDUCTION]: {
    [UserSegment.BEGINNER]: [5, 10, 15, 20, 25],
    [UserSegment.INTERMEDIATE]: [15, 25, 35, 45, 55],
    [UserSegment.ADVANCED]: [30, 45, 60, 75, 90],
  },
  [ProgressIndicatorKind.WATER_SAVINGS]: {
    [UserSegment.BEGINNER]: [50, 100, 150, 200, 250],
    [UserSegment.INTERMEDIATE]: [150, 250, 350, 450, 550],
    [UserSegment.ADVANCED]: [300, 450, 600, 750, 900],
  },
  [ProgressIndicatorKind.LAND_USE_REDUCTION]: {
    [UserSegment.BEGINNER]: [2, 4, 6, 8, 10],
    [UserSegment.INTERMEDIATE]: [6, 10, 14, 18, 22],
    [UserSegment.ADVANCED]: [12, 18, 24, 30, 36],
  },
};

export function getWheelDefinition(
  kind: SustainabilityWheelKind,
): SustainabilityWheelDefinition {
  return SUSTAINABILITY_WHEEL_DEFINITIONS[kind];
}

/** Target value to reach 100% for a given wheel/profile/stage (1-based). */
export function getStageTarget(
  kind: SustainabilityWheelKind,
  profile: UserSegment,
  stage: number,
): number {
  if (stage < 1 || stage > STAGES_PER_PROFILE) {
    throw new RangeError(
      `Stage must be between 1 and ${STAGES_PER_PROFILE}, got ${stage}`,
    );
  }
  return SUSTAINABILITY_WHEEL_STAGE_TARGETS[kind][profile][stage - 1];
}
