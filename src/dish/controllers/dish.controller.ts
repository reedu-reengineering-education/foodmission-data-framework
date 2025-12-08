import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { DishService } from '../services/dish.service';
import { CreateDishDto } from '../dto/create-dish.dto';
import { UpdateDishDto } from '../dto/update-dish.dto';
import {
  DishResponseDto,
  MultipleDishResponseDto,
} from '../dto/dish-response.dto';
import { QueryDishDto } from '../dto/query-dish.dto';

@ApiTags('dishes')
@Controller('dishes')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class DishController {
  constructor(private readonly dishService: DishService) {}

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a dish' })
  @ApiBody({ type: CreateDishDto })
  @ApiResponse({
    status: 201,
    description: 'Dish created successfully',
    type: DishResponseDto,
  })
  @ApiCrudErrorResponses()
  create(
    @Body() createDishDto: CreateDishDto,
    @CurrentUser('id') userId: string,
  ): Promise<DishResponseDto> {
    return this.dishService.create(createDishDto, userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List dishes for the user' })
  @ApiQuery({ name: 'mealType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    description: 'Dishes retrieved successfully',
    type: MultipleDishResponseDto,
  })
  @ApiCrudErrorResponses()
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryDishDto,
  ): Promise<MultipleDishResponseDto> {
    return this.dishService.findAll(userId, query);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a dish by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Dish retrieved successfully',
    type: DishResponseDto,
  })
  @ApiCrudErrorResponses()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<DishResponseDto> {
    return this.dishService.findOne(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a dish' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Dish updated successfully',
    type: DishResponseDto,
  })
  @ApiCrudErrorResponses()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDishDto: UpdateDishDto,
    @CurrentUser('id') userId: string,
  ): Promise<DishResponseDto> {
    return this.dishService.update(id, updateDishDto, userId);
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a dish' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Dish deleted successfully' })
  @ApiCrudErrorResponses()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.dishService.remove(id, userId);
  }
}
