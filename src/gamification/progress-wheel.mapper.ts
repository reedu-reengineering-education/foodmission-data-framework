import { UserSegment } from '@prisma/client';
import { ProgressWheelDto } from './dto/progress-wheel.dto';
import {
  getStageInfo,
  getWheelDefinition,
  SustainabilityWheelKind,
} from './progress-wheels.config';

export function toProgressWheelDto(
  row: {
    id: string;
    kind: SustainabilityWheelKind;
    level: number;
    accumulatedValue: number;
    targetValue: number;
    allTimeTotal: number;
    cycleStartedAt: Date;
    lastUpdatedAt: Date;
  },
  profile: UserSegment,
): ProgressWheelDto {
  const definition = getWheelDefinition(row.kind);
  const stageInfo = getStageInfo(profile, row.level);
  const percentComplete =
    row.targetValue > 0
      ? Math.min(100, (row.accumulatedValue / row.targetValue) * 100)
      : 0;

  return {
    id: row.id,
    kind: row.kind,
    label: definition.label,
    unit: definition.unit,
    profile,
    stage: row.level,
    stageTitle: stageInfo.title,
    sustainabilityTargetPercent: stageInfo.sustainabilityTargetPercent,
    accumulatedValue: row.accumulatedValue,
    targetValue: row.targetValue,
    percentComplete,
    allTimeTotal: row.allTimeTotal,
    cycleStartedAt: row.cycleStartedAt,
    lastUpdatedAt: row.lastUpdatedAt,
  };
}
