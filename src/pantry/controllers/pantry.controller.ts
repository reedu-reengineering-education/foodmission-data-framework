import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from 'src/common/guards/auth.guards';
import { PantryService } from '../services/pantry.service';
import { Public } from 'nest-keycloak-connect';
import { PantryResponseDto } from '../dto/response-pantry.dto';
import { MultipleShoppingListResponseDto } from 'src/shoppingList/dto/shoppingList-response.dto';

@ApiTags('Pantry')
@Controller('Pantry')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class PantryController {
  constructor(private readonly pantryService: PantryService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get Pantry',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: 200,
    description: 'Pantry retrieved successfully',
    type: MultipleShoppingListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getPantry(): Promise<PantryResponseDto> {
    return this.pantryService.getPantry();
  }
}
