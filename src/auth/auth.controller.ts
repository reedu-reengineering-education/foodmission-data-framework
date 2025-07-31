import {
  Controller,
  Get,
  Request,
  UnauthorizedException,
  UseGuards,
  Put,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { Public, Roles } from 'nest-keycloak-connect';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UserProfileService } from './user-profile.service';

interface KeycloakUser {
  sub: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
  exp: number;
  iat: number;
}

interface AuthenticatedRequest {
  user: KeycloakUser;
}

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get('info')
  @Public()
  @ApiOperation({
    summary: 'Get Keycloak authentication info',
    description:
      'Returns Keycloak server information for client-side authentication setup.',
  })
  @ApiOkResponse({
    description: 'Authentication info retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        authServerUrl: { type: 'string', example: 'http://localhost:8080' },
        realm: { type: 'string', example: 'foodmission' },
        clientId: { type: 'string', example: 'foodmission-web' },
        redirectUri: { type: 'string', example: 'http://localhost:3000' },
      },
    },
  })
  getAuthInfo() {
    return {
      authServerUrl:
        process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080',
      realm: process.env.KEYCLOAK_REALM || 'foodmission',
      clientId: process.env.KEYCLOAK_WEB_CLIENT_ID || 'foodmission-web', // Different client for frontend
      redirectUri: process.env.FRONTEND_URL || 'http://localhost:3000',
    };
  }

  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Get authenticated user profile',
    description:
      'Returns the profile information of the currently authenticated user. Automatically creates user record if not exists.',
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        keycloakId: { type: 'string' },
        preferences: { type: 'object' },
        settings: { type: 'object' },
      },
    },
  })
  async getProfile(@Request() req: AuthenticatedRequest) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return await this.userProfileService.getOrCreateProfile({
      sub: user.sub,
      email: user.email,
      given_name: user.given_name,
      family_name: user.family_name,
    });
  }

  @Put('profile/preferences')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update user preferences',
    description: 'Update app-specific user preferences.',
  })
  @ApiBody({
    description: 'User preferences object',
    schema: { type: 'object' },
  })
  async updatePreferences(
    @Request() req: AuthenticatedRequest,
    @Body() preferences: Record<string, unknown>,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return await this.userProfileService.updatePreferences(
      user.sub,
      preferences,
    );
  }

  @Put('profile/settings')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update user settings',
    description: 'Update app-specific user settings.',
  })
  @ApiBody({
    description: 'User settings object',
    schema: { type: 'object' },
  })
  async updateSettings(
    @Request() req: AuthenticatedRequest,
    @Body() settings: Record<string, unknown>,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return await this.userProfileService.updateSettings(user.sub, settings);
  }

  @Get('health')
  @Public()
  @ApiOperation({
    summary: 'Authentication service health check',
    description:
      'Returns the health status of the authentication service. This endpoint is public.',
  })
  @ApiOkResponse({
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
        },
        service: {
          type: 'string',
          example: 'auth',
        },
      },
    },
  })
  healthCheck() {
    return { status: 'ok', service: 'auth' };
  }

  @Get('token-info')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get JWT token information',
    description:
      'Returns detailed information about the current JWT token. Requires valid JWT token.',
  })
  @ApiOkResponse({
    description: 'Token information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        sub: {
          type: 'string',
          example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          description: 'Subject (user ID) from token',
        },
        email: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
        },
        name: {
          type: 'string',
          example: 'John Doe',
        },
        given_name: {
          type: 'string',
          example: 'John',
        },
        family_name: {
          type: 'string',
          example: 'Doe',
        },
        roles: {
          type: 'array',
          items: { type: 'string' },
          example: ['user', 'admin'],
        },
        exp: {
          type: 'number',
          example: 1640995200,
          description: 'Token expiration timestamp',
        },
        iat: {
          type: 'number',
          example: 1640991600,
          description: 'Token issued at timestamp',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated - JWT token required',
  })
  getTokenInfo(@Request() req: AuthenticatedRequest) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return {
      sub: user.sub,
      email: user.email,
      name: user.name,
      given_name: user.given_name,
      family_name: user.family_name,
      roles:
        user.resource_access?.[
          process.env.KEYCLOAK_CLIENT_ID || 'foodmission-api'
        ]?.roles || [],
      exp: user.exp,
      iat: user.iat,
    };
  }

  @Get('admin-only')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Admin-only test endpoint',
    description:
      'Test endpoint that requires admin role. Used for testing role-based access control.',
  })
  @ApiOkResponse({
    description: 'Admin access confirmed',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'This endpoint is only accessible to admins',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin role required',
  })
  adminEndpoint() {
    return { message: 'This endpoint is only accessible to admins' };
  }
}
