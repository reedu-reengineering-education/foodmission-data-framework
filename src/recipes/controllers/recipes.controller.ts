import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { RecipesService } from '../services/recipes.service';
import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import {
  MultipleRecipeResponseDto,
  RecipeResponseDto,
} from '../dto/recipe-response.dto';
import { QueryRecipeDto } from '../dto/query-recipe.dto';
import {
  RateRecipeDto,
  RecipeRatingResponseDto,
} from '../dto/recipe-rating.dto';

@ApiTags('recipes')
@Controller('recipes')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class RecipeController {
  constructor(private readonly recipeService: RecipesService) {}

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a recipe' })
  @ApiBody({ type: CreateRecipeDto })
  @ApiResponse({
    status: 201,
    description: 'Recipe created successfully',
    type: RecipeResponseDto,
  })
  @ApiCrudErrorResponses()
  create(
    @Body() createRecipeDto: CreateRecipeDto,
    @CurrentUser('id') userId: string,
  ): Promise<RecipeResponseDto> {
    return this.recipeService.create(createRecipeDto, userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List recipes' })
  @ApiQuery({ name: 'tags', required: false, isArray: true })
  @ApiQuery({ name: 'allergens', required: false, isArray: true })
  @ApiQuery({ name: 'difficulty', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    description: 'Recipes retrieved successfully',
    type: MultipleRecipeResponseDto,
  })
  @ApiCrudErrorResponses()
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryRecipeDto,
  ): Promise<MultipleRecipeResponseDto> {
    return this.recipeService.findAll(userId, query);
  }

  @Get('me')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "List current user's own recipes" })
  @ApiQuery({ name: 'tags', required: false, isArray: true })
  @ApiQuery({ name: 'allergens', required: false, isArray: true })
  @ApiQuery({ name: 'difficulty', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    description: 'My recipes retrieved successfully',
    type: MultipleRecipeResponseDto,
  })
  @ApiCrudErrorResponses()
  findMine(
    @CurrentUser('id') userId: string,
    @Query() query: QueryRecipeDto,
  ): Promise<MultipleRecipeResponseDto> {
    return this.recipeService.findMine(userId, query);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get recipe by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Recipe retrieved successfully',
    type: RecipeResponseDto,
  })
  @ApiCrudErrorResponses()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<RecipeResponseDto> {
    return this.recipeService.findOne(id, userId);
  }

  @Get(':id/rating')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Get a recipe's aggregate rating and the current user's rating",
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Rating retrieved successfully',
    type: RecipeRatingResponseDto,
  })
  @ApiCrudErrorResponses()
  getRating(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<RecipeRatingResponseDto> {
    return this.recipeService.getRating(id, userId);
  }

  @Put(':id/rating')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Rate a recipe (replaces the current user's previous rating)",
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: RateRecipeDto })
  @ApiResponse({
    status: 200,
    description: 'Rating saved successfully',
    type: RecipeRatingResponseDto,
  })
  @ApiCrudErrorResponses()
  rate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rateRecipeDto: RateRecipeDto,
    @CurrentUser('id') userId: string,
  ): Promise<RecipeRatingResponseDto> {
    return this.recipeService.rate(id, rateRecipeDto, userId);
  }

  @Delete(':id/rating')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Remove the current user's rating from a recipe" })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Rating removed successfully',
    type: RecipeRatingResponseDto,
  })
  @ApiCrudErrorResponses()
  removeRating(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<RecipeRatingResponseDto> {
    return this.recipeService.removeRating(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update recipe' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Recipe updated successfully',
    type: RecipeResponseDto,
  })
  @ApiCrudErrorResponses()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRecipeDto: UpdateRecipeDto,
    @CurrentUser('id') userId: string,
  ): Promise<RecipeResponseDto> {
    return this.recipeService.update(id, updateRecipeDto, userId);
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete recipe' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Recipe deleted successfully' })
  @ApiCrudErrorResponses()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.recipeService.remove(id, userId);
  }
}
