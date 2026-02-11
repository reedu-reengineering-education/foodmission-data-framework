import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class JoinGroupDto {
  @ApiProperty({
    description: 'The invite code to join the group',
    example: 'abc123-def456-ghi789',
  })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}
