import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { GroupRole } from '@prisma/client';

export class GroupMemberResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the membership',
    example: 'uuid-membership-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The user ID of the member',
    example: 'uuid-user-id',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    description: 'The role of the member in the group',
    enum: GroupRole,
    example: 'MEMBER',
  })
  @Expose()
  role: GroupRole;

  @ApiProperty({
    description: 'When the user joined the group',
  })
  @Expose()
  joinedAt: Date;

  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
  })
  @Expose()
  firstName?: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
  })
  @Expose()
  lastName?: string;

  @ApiProperty({
    description: 'Email of the user',
    example: 'john@example.com',
  })
  @Expose()
  email?: string;
}
