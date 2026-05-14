import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Auth details object present in both user and admin events
 */
export class KeycloakAuthDetailsDto {
  @ApiPropertyOptional({ description: 'Realm ID of the authenticating user' })
  @IsOptional()
  @IsString()
  realmId?: string;

  @ApiPropertyOptional({ description: 'Client ID used for authentication' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'User ID of the authenticating user' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'IP address of the client' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Username of the authenticating user' })
  @IsOptional()
  @IsString()
  username?: string;
}

/**
 * DTO for Keycloak Admin Events (operations performed via admin console/API)
 * Example type: "admin.USER-DELETE"
 */
export class KeycloakAdminEventDto {
  @ApiProperty({ description: 'Unique event ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Timestamp of the event in milliseconds' })
  @IsNumber()
  time!: number;

  @ApiProperty({ description: 'Realm ID where the event occurred' })
  @IsString()
  realmId!: string;

  @ApiPropertyOptional({ description: 'Realm name where the event occurred' })
  @IsOptional()
  @IsString()
  realmName?: string;

  @ApiPropertyOptional({ description: 'Unique identifier for the event' })
  @IsOptional()
  @IsString()
  uid?: string;

  @ApiPropertyOptional({ description: 'Authentication details of the admin' })
  @IsOptional()
  @IsObject()
  authDetails?: KeycloakAuthDetailsDto;

  @ApiProperty({
    description: 'Type of operation',
    example: 'DELETE',
    enum: ['CREATE', 'UPDATE', 'DELETE', 'ACTION'],
  })
  @IsString()
  operationType!: string;

  @ApiProperty({
    description: 'Resource type affected',
    example: 'USER',
  })
  @IsString()
  resourceType!: string;

  @ApiPropertyOptional({
    description: 'Path of the affected resource',
    example: 'users/5742e900-998d-456a-84bd-6e9ac3b66d08',
  })
  @IsOptional()
  @IsString()
  resourcePath?: string;

  @ApiProperty({
    description: 'Event type with prefix',
    example: 'admin.USER-DELETE',
  })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ description: 'Additional event details' })
  @IsOptional()
  @IsObject()
  details?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Representation of the resource (JSON string)',
  })
  @IsOptional()
  @IsString()
  representation?: string;

  @ApiPropertyOptional({ description: 'Error message if operation failed' })
  @IsOptional()
  @IsString()
  error?: string;
}

/**
 * DTO for Keycloak User Events (login, logout, register, etc.)
 * Example type: "access.DELETE_ACCOUNT"
 */
export class KeycloakUserEventDto {
  @ApiProperty({ description: 'Unique event ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Timestamp of the event in milliseconds' })
  @IsNumber()
  time!: number;

  @ApiProperty({ description: 'Realm ID where the event occurred' })
  @IsString()
  realmId!: string;

  @ApiPropertyOptional({ description: 'Realm name where the event occurred' })
  @IsOptional()
  @IsString()
  realmName?: string;

  @ApiPropertyOptional({ description: 'Unique identifier for the event' })
  @IsOptional()
  @IsString()
  uid?: string;

  @ApiPropertyOptional({ description: 'Authentication details' })
  @IsOptional()
  @IsObject()
  authDetails?: KeycloakAuthDetailsDto;

  @ApiProperty({
    description: 'Type of event with prefix',
    example: 'access.DELETE_ACCOUNT',
  })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ description: 'Additional event details' })
  @IsOptional()
  @IsObject()
  details?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Error message if event is an error type',
  })
  @IsOptional()
  @IsString()
  error?: string;
}

/**
 * Unified DTO that can handle both admin and user events
 * The webhook will receive one of these types directly, distinguished by the presence of:
 * - operationType + resourceType → Admin event
 * - Only type field → User event
 */
export class KeycloakEventDto {
  @ApiPropertyOptional({ description: 'Admin event payload' })
  @IsOptional()
  @IsObject()
  adminEvent?: KeycloakAdminEventDto;

  @ApiPropertyOptional({ description: 'User event payload' })
  @IsOptional()
  @IsObject()
  userEvent?: KeycloakUserEventDto;
}
