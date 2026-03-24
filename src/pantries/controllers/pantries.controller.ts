import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { PantryService } from '../services/pantries.service';
import { Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PantryResponseDto } from '../dto/response-pantry.dto';

@ApiTags('pantries')
@Controller('pantries')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class PantriesController {
  constructor(private readonly pantryService: PantryService) {}

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user pantry',
    description:
      "Retrieves the authenticated user's dedicated pantry with all items. Every user has exactly one pantry that is automatically created when needed. Requires user or admin role.",
  })
  @ApiResponse({
    status: 200,
    description: 'Pantry retrieved successfully',
    type: PantryResponseDto,
  })
  @ApiCrudErrorResponses()
  async getPantry(
    @CurrentUser('id') userId: string,
  ): Promise<PantryResponseDto> {
    return this.pantryService.getOrCreatePantry(userId);
  }
}
