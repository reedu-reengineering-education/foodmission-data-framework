import {
  Controller,
  Get,
  Request,
  UseGuards,
  Body,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOAuth2,
  ApiOkResponse,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiCrudErrorResponses } from '../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { extractKeycloakRoles } from '../common/utils/keycloak-roles.util';
import { Public, Roles } from 'nest-keycloak-connect';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { defaultThrottlerConfig } from '../throttler.config';
import { UserProfilesService } from '../users/services/user-profiles.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AdminResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiOAuth2(['openid', 'profile', 'email'], 'keycloak-oauth2')
@Throttle(defaultThrottlerConfig)
export class AuthController {
  constructor(
    private readonly userProfileService: UserProfilesService,
    private readonly authService: AuthService,
  ) {}

  @Post('reset-password')
  @ApiOperation({ summary: 'Trigger password reset email (self-service)' })
  @ApiResponse({
    status: 200,
    description: 'Reset email triggered (if user exists)',
  })
  @ApiCrudErrorResponses()
  async resetPassword(
    @CurrentUser()
    user: {
      sub: string;
      email: string;
      resource_access?: Record<string, { roles?: string[] }>;
    },
  ) {
    const roles = extractKeycloakRoles(user);
    await this.authService.triggerPasswordReset(user.sub, user.email, roles);
    return { status: 'ok' };
  }

  @Post('admin/reset-password')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: trigger password reset email for any user' })
  @ApiBody({ type: AdminResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Reset email triggered (if user exists)',
  })
  @ApiCrudErrorResponses()
  async adminResetPassword(
    @CurrentUser()
    user: {
      sub: string;
      email: string;
      resource_access?: Record<string, { roles?: string[] }>;
    },
    @Request() req: { headers?: Record<string, string> },
    @Body() dto: AdminResetPasswordDto,
  ) {
    const roles = extractKeycloakRoles(user);
    await this.authService.triggerPasswordReset(user.sub, dto.email, roles);
    return { status: 'ok' };
  }

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
      authServerUrl: process.env.KEYCLOAK_BASE_URL!,
      realm: process.env.KEYCLOAK_REALM!,
      clientId: process.env.KEYCLOAK_WEB_CLIENT_ID!,
      redirectUri: process.env.FRONTEND_URL!,
    };
  }

  @Get('profile')
  @ApiOperation({
    summary:
      'Get and create authenticated user profile (deprecated possibly depending on registration flow)',
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
        yearOfBirth: { type: 'integer' },
        keycloakId: { type: 'string' },
        preferences: { type: 'object' },
        settings: { type: 'object' },
      },
    },
  })
  @ApiCrudErrorResponses()
  async getProfile(@CurrentUser() user: any) {
    return await this.userProfileService.getOrCreateProfile({
      sub: user.sub,
      email: user.email,
      given_name: user.given_name,
      family_name: user.family_name,
    });
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

  @Post('register')
  @Public()
  @Throttle(defaultThrottlerConfig)
  @ApiOperation({
    summary: 'Register a new user in Keycloak and create local user',
  })
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @Throttle(defaultThrottlerConfig)
  @ApiOperation({ summary: 'Login user via Keycloak and return tokens' })
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }

  @Post('logout')
  @Public()
  @Throttle(defaultThrottlerConfig)
  @ApiOperation({ summary: 'Logout by revoking token at Keycloak' })
  async logout(@Body() dto: LogoutDto) {
    return await this.authService.logout(dto.token, dto.tokenTypeHint);
  }

  @Post('refresh')
  @Public()
  @Throttle(defaultThrottlerConfig)
  @ApiOperation({ summary: 'Exchange refresh token for new tokens' })
  async refresh(@Body() dto: RefreshDto) {
    return await this.authService.refresh(dto.token);
  }

  @Get('token-info')
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
  @ApiCrudErrorResponses()
  getTokenInfo(
    @CurrentUser()
    user: {
      sub: string;
      email: string;
      name: string;
      given_name: string;
      family_name: string;
      resource_access?: Record<string, { roles?: string[] }>;
      exp: number;
      iat: number;
    },
  ) {
    return {
      sub: user.sub,
      email: user.email,
      name: user.name,
      given_name: user.given_name,
      family_name: user.family_name,
      roles: extractKeycloakRoles(user),
      exp: user.exp,
      iat: user.iat,
    };
  }

  @Get('admin-only')
  @Roles('admin')
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
          example: 'Admin access granted',
        },
        status: {
          type: 'string',
          example: 'success',
        },
      },
    },
  })
  @ApiCrudErrorResponses()
  adminEndpoint() {
    return {
      message: 'Admin access granted',
      status: 'success',
    };
  }
}
