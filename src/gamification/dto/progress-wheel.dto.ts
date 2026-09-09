import { ApiProperty } from '@nestjs/swagger';
import { ProgressIndicatorKind, UserSegment } from '@prisma/client';

export class ProgressWheelDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: [
      ProgressIndicatorKind.CO2_REDUCTION,
      ProgressIndicatorKind.ENERGY_REDUCTION,
      ProgressIndicatorKind.WATER_SAVINGS,
      ProgressIndicatorKind.LAND_USE_REDUCTION,
    ],
  })
  kind!: string;

  @ApiProperty({ description: 'Display label, e.g. "CO₂ Reduction"' })
  label!: string;

  @ApiProperty({ description: 'Unit for accumulatedValue/targetValue' })
  unit!: string;

  @ApiProperty({
    enum: UserSegment,
    description: 'Profile the current stage targets are drawn from',
  })
  profile!: UserSegment;

  @ApiProperty({
    minimum: 1,
    maximum: 5,
    description: 'Current stage within the profile (1-5)',
  })
  stage!: number;

  @ApiProperty({ description: 'Amount accumulated in the current cycle' })
  accumulatedValue!: number;

  @ApiProperty({ description: 'Amount needed to complete the current stage' })
  targetValue!: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  percentComplete!: number;

  @ApiProperty({ description: 'Lifetime accumulated amount, across cycles' })
  allTimeTotal!: number;

  @ApiProperty()
  cycleStartedAt!: Date;

  @ApiProperty()
  lastUpdatedAt!: Date;
}
