import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { MealItemService } from '../services/meal-items.service';
import { CreateMealItemDto } from '../dto/create-meal-item.dto';
import { UpdateMealItemDto } from '../dto/update-meal-item.dto';
import { MealItemResponseDto } from '../dto/meal-item-response.dto';
import { DataBaseAuthGuard } from '../../../common/guards/database-auth.guards';
import { Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ApiCommonErrorResponses } from '../../../common/decorators/api-error-responses.decorator';

@ApiTags('meal-items')
@Controller('meals/:mealId/meal-items')
@UseGuards(DataBaseAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MealItemController {
  constructor(private readonly mealItemService: MealItemService) {}

  @Post()
  @Roles('user', 'admin')
  @ApiOperation({
    summary: 'Add a food item to a meal',
    description:
      'Adds a specific food product or food category to a meal. Either foodId or foodCategoryId must be provided, but not both.',
  })
  @ApiBody({
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            quantity: { type: 'number', example: 2, default: 1 },
            unit: { type: 'string', example: 'PIECES', default: 'PIECES' },
            notes: { type: 'string', example: 'Extra spicy' },
            foodId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
              description: 'UUID of the specific food product (OpenFoodFacts).',
            },
          },
          required: ['foodId', 'quantity', 'unit'],
        },
        {
          type: 'object',
          properties: {
            quantity: { type: 'number', example: 2, default: 1 },
            unit: { type: 'string', example: 'PIECES', default: 'PIECES' },
            notes: { type: 'string', example: 'Extra spicy' },
            foodCategoryId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440002',
              description: 'UUID of the food category (NEVO generic).',
            },
          },
          required: ['foodCategoryId', 'quantity', 'unit'],
        },
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Meal item created successfully',
    type: MealItemResponseDto,
  })
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    notFound: true,
    conflict: true,
  })
  async create(
    @Param('mealId') mealId: string,
    @Body() createMealItemDto: CreateMealItemDto,
    @CurrentUser('id') userId: string,
  ) {
    // Override mealId from route param
    createMealItemDto.mealId = mealId;
    return this.mealItemService.create(createMealItemDto, userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiOperation({
    summary: 'Get all items in a meal',
    description:
      'Retrieves all food items (products and categories) for a specific meal',
  })
  @ApiResponse({
    status: 200,
    description: 'Meal items retrieved successfully',
    type: [MealItemResponseDto],
  })
  @ApiCommonErrorResponses({
    unauthorized: true,
    notFound: true,
  })
  async findByMealId(
    @Param('mealId') mealId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.mealItemService.findByMealId(mealId, userId);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiOperation({
    summary: 'Get a specific meal item',
    description: 'Retrieves a specific item from a meal by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Meal item retrieved successfully',
    type: MealItemResponseDto,
  })
  @ApiCommonErrorResponses({
    unauthorized: true,
    notFound: true,
  })
  async findById(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.mealItemService.findById(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiOperation({
    summary: 'Update a meal item',
    description:
      'Updates an existing meal item. Can change the food/category reference, quantity, unit, or notes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Meal item updated successfully',
    type: MealItemResponseDto,
  })
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    notFound: true,
    conflict: true,
  })
  async update(
    @Param('id') id: string,
    @Body() updateMealItemDto: UpdateMealItemDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.mealItemService.update(id, updateMealItemDto, userId);
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @ApiOperation({
    summary: 'Remove a meal item',
    description: 'Removes a specific item from a meal',
  })
  @ApiResponse({
    status: 204,
    description: 'Meal item deleted successfully',
  })
  @ApiCommonErrorResponses({
    unauthorized: true,
    notFound: true,
  })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.mealItemService.delete(id, userId);
  }
}
