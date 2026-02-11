import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  Gender,
  ActivityLevel,
  AnnualIncomeLevel,
} from '@prisma/client';

export class VirtualMemberResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the virtual member',
    example: 'uuid-virtual-member-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Nickname of the virtual member',
    example: 'Little Timmy',
  })
  @Expose()
  nickname: string;

  @ApiProperty({
    description: 'Age of the virtual member',
    example: 8,
    required: false,
  })
  @Expose()
  age?: number;

  @ApiProperty({
    description: 'Gender of the virtual member',
    enum: Gender,
    required: false,
  })
  @Expose()
  gender?: Gender;

  @ApiProperty({
    description: 'Physical activity level',
    enum: ActivityLevel,
    required: false,
  })
  @Expose()
  activityLevel?: ActivityLevel;

  @ApiProperty({
    description: 'Annual income level',
    enum: AnnualIncomeLevel,
    required: false,
  })
  @Expose()
  annualIncome?: AnnualIncomeLevel;

  @ApiProperty({
    description: 'Free-form preferences (JSON)',
    required: false,
  })
  @Expose()
  preferences?: Record<string, unknown>;

  @ApiProperty({
    description: 'When the virtual member was created',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'User ID who created this virtual member',
    example: 'uuid-user-id',
  })
  @Expose()
  createdBy: string;
}
