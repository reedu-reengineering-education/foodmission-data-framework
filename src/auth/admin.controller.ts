import { Controller, Post, Get, Body } from '@nestjs/common';
import { Roles } from 'nest-keycloak-connect';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiCrudErrorResponses } from '../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { extractKeycloakRoles } from '../common/utils/keycloak-roles.util';
import { AuthService } from './auth.service';
import { AdminResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth-admin')
@Controller('auth/admin')
export class AdminController {
  constructor(private readonly authService: AuthService) {}

  @Get()
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
        message: { type: 'string', example: 'Admin access granted' },
        status: { type: 'string', example: 'success' },
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

  @Post('reset-password')
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
    @Body() dto: AdminResetPasswordDto,
  ) {
    const roles = extractKeycloakRoles(user);
    await this.authService.triggerPasswordReset(user.sub, dto.email, roles);
    return { status: 'ok' };
  }
}
