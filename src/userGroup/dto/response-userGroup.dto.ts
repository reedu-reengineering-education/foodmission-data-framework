import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { GroupMemberResponseDto } from './response-groupMember.dto';
import { VirtualMemberResponseDto } from './response-virtualMember.dto';

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
    description: 'The invite code for joining the group',
    example: 'abc123-def456',
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
    description: 'List of registered members in the group',
    type: [GroupMemberResponseDto],
  })
  @Expose()
  @Type(() => GroupMemberResponseDto)
  members: GroupMemberResponseDto[];

  @ApiProperty({
    description: 'List of virtual members (without accounts)',
    type: [VirtualMemberResponseDto],
  })
  @Expose()
  @Type(() => VirtualMemberResponseDto)
  virtualMembers: VirtualMemberResponseDto[];
}
