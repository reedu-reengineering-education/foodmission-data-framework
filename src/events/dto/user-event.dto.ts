import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty({ example: 'wallet' })
  source!: string;

  @ApiProperty({ description: 'When the event occurred' })
  timestamp!: Date;

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  groupId?: string | null;
}
