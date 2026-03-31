import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { MemberResponseDto } from './response-member.dto';

export class UserGroupResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the group',
    example: 'uuid-group-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The name of the group',
    example: 'Smith Family',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Optional description of the group',
    example: 'Our family shopping and meal planning group',
    required: false,
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description:
      'The invite code for joining the group (7-character alphanumeric)',
    example: 'AXY1278',
    minLength: 7,
    maxLength: 7,
    pattern: '^[A-Z0-9]{7}$',
  })
  @Expose()
  inviteCode: string;

  @ApiProperty({
    description: 'The user ID who created the group',
    example: 'uuid-user-id',
  })
  @Expose()
  createdBy: string;

  @ApiProperty({
    description: 'When the group was created',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description:
      'List of all members (both registered users and virtual members). Use `isVirtual` to distinguish.',
    type: [MemberResponseDto],
  })
  @Expose()
  @Type(() => MemberResponseDto)
  members: MemberResponseDto[];
}
