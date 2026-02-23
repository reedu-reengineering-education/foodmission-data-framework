import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  GroupRole,
  Gender,
  ActivityLevel,
  AnnualIncomeLevel,
} from '@prisma/client';

export class MemberResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the membership',
    example: 'uuid-membership-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The role of the member in the group',
    enum: GroupRole,
    example: 'MEMBER',
  })
  @Expose()
  role: GroupRole;

  @ApiProperty({
    description: 'When the member joined the group',
  })
  @Expose()
  joinedAt: Date;

  @ApiProperty({
    description:
      'Whether this is a virtual member (true) or registered user (false)',
    example: false,
  })
  @Expose()
  isVirtual: boolean;

  // ========== Registered User Fields ==========

  @ApiProperty({
    description: 'The user ID (only for registered users)',
    example: 'uuid-user-id',
    required: false,
  })
  @Expose()
  userId?: string;

  @ApiProperty({
    description: 'First name (only for registered users)',
    example: 'John',
    required: false,
  })
  @Expose()
  firstName?: string;

  @ApiProperty({
    description: 'Last name (only for registered users)',
    example: 'Doe',
    required: false,
  })
  @Expose()
  lastName?: string;

  @ApiProperty({
    description: 'Email (only for registered users)',
    example: 'john@example.com',
    required: false,
  })
  @Expose()
  email?: string;

  @ApiProperty({
    description:
      'Nickname (primarily for virtual members, optional display name for registered)',
    example: 'Little Timmy',
    required: false,
  })
  @Expose()
  nickname?: string;

  @ApiProperty({
    description: 'Age (only for virtual members)',
    example: 8,
    required: false,
  })
  @Expose()
  age?: number;

  @ApiProperty({
    description: 'Gender (only for virtual members)',
    enum: Gender,
    required: false,
  })
  @Expose()
  gender?: Gender;

  @ApiProperty({
    description: 'Physical activity level (only for virtual members)',
    enum: ActivityLevel,
    required: false,
  })
  @Expose()
  activityLevel?: ActivityLevel;

  @ApiProperty({
    description: 'Annual income level (only for virtual members)',
    enum: AnnualIncomeLevel,
    required: false,
  })
  @Expose()
  annualIncome?: AnnualIncomeLevel;

  @ApiProperty({
    description: 'Free-form preferences (only for virtual members)',
    required: false,
  })
  @Expose()
  preferences?: object;

  @ApiProperty({
    description: 'ID of the user who created this virtual member',
    required: false,
  })
  @Expose()
  createdBy?: string;
}
