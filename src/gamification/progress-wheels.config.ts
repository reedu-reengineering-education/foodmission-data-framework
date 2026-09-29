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
 * by wheel kind and user profile. Sourced from the Beginner/Intermediate/
 * Advanced User Wheels Progress tables (Figures 12-14).
 */
export const SUSTAINABILITY_WHEEL_STAGE_TARGETS: Record<
  SustainabilityWheelKind,
  Record<UserSegment, StageTargets>
> = {
  [ProgressIndicatorKind.CO2_REDUCTION]: {
    [UserSegment.BEGINNER]: [2, 4, 6, 8, 10],
    [UserSegment.INTERMEDIATE]: [2.5, 5.0, 7.5, 10.0, 12.5],
    [UserSegment.ADVANCED]: [2.25, 4.5, 6.75, 9.0, 11.25],
  },
  [ProgressIndicatorKind.ENERGY_REDUCTION]: {
    [UserSegment.BEGINNER]: [1.5, 3.0, 4.5, 6.0, 7.5],
    [UserSegment.INTERMEDIATE]: [2.0, 4.0, 6.0, 8.0, 10.0],
    [UserSegment.ADVANCED]: [1.5, 3.0, 4.5, 6.0, 7.5],
  },
  [ProgressIndicatorKind.WATER_SAVINGS]: {
    [UserSegment.BEGINNER]: [25, 50, 75, 100, 125],
    [UserSegment.INTERMEDIATE]: [35, 70, 105, 140, 175],
    [UserSegment.ADVANCED]: [30, 60, 90, 120, 150],
  },
  [ProgressIndicatorKind.LAND_USE_REDUCTION]: {
    [UserSegment.BEGINNER]: [1.0, 2.0, 3.0, 4.0, 5.0],
    [UserSegment.INTERMEDIATE]: [1.2, 2.4, 3.6, 4.8, 6.0],
    [UserSegment.ADVANCED]: [1.2, 2.4, 3.6, 4.8, 6.0],
  },
};

export interface StageInfo {
  /** Wheel title shown at this stage, e.g. "Getting Started". */
  title: string;
  /** Overall sustainability target for this stage, as a percentage. */
  sustainabilityTargetPercent: number;
}

export type StageInfoList = readonly [
  StageInfo,
  StageInfo,
  StageInfo,
  StageInfo,
  StageInfo,
];

/**
 * Per-stage title and sustainability target percentage, by user profile.
 * Shared across all 4 wheel kinds (stage progression is a whole-profile
 * concept, not a per-wheel one) — sourced from Figures 12-14.
 */
export const SUSTAINABILITY_WHEEL_STAGE_INFO: Record<
  UserSegment,
  StageInfoList
> = {
  [UserSegment.BEGINNER]: [
    { title: 'Getting Started', sustainabilityTargetPercent: 5 },
    { title: 'Building Better Habits', sustainabilityTargetPercent: 10 },
    { title: 'Making a Difference', sustainabilityTargetPercent: 15 },
    { title: 'Creating Positive Change', sustainabilityTargetPercent: 20 },
    { title: 'Living More Sustainably', sustainabilityTargetPercent: 25 },
  ],
  [UserSegment.INTERMEDIATE]: [
    { title: 'Keeping the Momentum', sustainabilityTargetPercent: 10 },
    {
      title: 'Consistent Sustainable Choices',
      sustainabilityTargetPercent: 20,
    },
    { title: 'Increasing Your Impact', sustainabilityTargetPercent: 30 },
    { title: 'Inspiring Positive Change', sustainabilityTargetPercent: 40 },
    { title: 'Leading by Example', sustainabilityTargetPercent: 50 },
  ],
  [UserSegment.ADVANCED]: [
    { title: 'Sustainable Lifestyle', sustainabilityTargetPercent: 15 },
    { title: 'Maximising Your Impact', sustainabilityTargetPercent: 30 },
    { title: 'Environmental Leadership', sustainabilityTargetPercent: 45 },
    { title: 'Driving Greater Change', sustainabilityTargetPercent: 60 },
    { title: 'FOODMISSION Champion', sustainabilityTargetPercent: 75 },
  ],
};

/** Title and sustainability target % for a given profile/stage (1-based). */
export function getStageInfo(profile: UserSegment, stage: number): StageInfo {
  if (stage < 1 || stage > STAGES_PER_PROFILE) {
    throw new RangeError(
      `Stage must be between 1 and ${STAGES_PER_PROFILE}, got ${stage}`,
    );
  }
  return SUSTAINABILITY_WHEEL_STAGE_INFO[profile][stage - 1];
}

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
