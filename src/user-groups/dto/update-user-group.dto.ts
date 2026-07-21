import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class UpdateUserGroupDto {
  @ApiProperty({
    description: 'The name of the group',
    example: 'Smith Family',
    maxLength: 255,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Optional description of the group',
    example: 'Our family shopping and meal planning group',
    required: false,
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Current group quest id (when Quest catalog exists)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  currentQuestId?: string | null;
}
