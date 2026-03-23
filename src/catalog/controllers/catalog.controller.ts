import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOAuth2,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { ApiPaginationQuery } from '../../common/decorators/api-query-params.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Public, Roles } from 'nest-keycloak-connect';
import {
  CatalogListResponseDto,
  CatalogStartupResponseDto,
  PaginatedCatalogListResponseDto,
} from '../dto/catalog-response.dto';
import { CatalogService } from '../services/catalog.service';
import {
  RegionsQueryDto,
  CatalogPaginatedQueryDto,
} from '../dto/catalog-query.dto';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

@ApiTags('catalog')
@Controller('catalog')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('startup')
  @Public()
  @ApiOperation({
    summary:
      'Static values needed at regular app startup (excluding world geography)',
  })
  @ApiResponse({
    status: 200,
    description: 'Startup catalog values retrieved successfully',
    type: CatalogStartupResponseDto,
  })
  @ApiCrudErrorResponses()
  startup(): CatalogStartupResponseDto {
    return this.catalogService.startup();
  }

  @Get('genders')
  @Public()
  @ApiOperation({ summary: 'List genders' })
  @ApiResponse({ status: 200, type: CatalogListResponseDto })
  @ApiCrudErrorResponses()
  genders(): CatalogListResponseDto {
    return this.catalogService.listGenders();
  }

  @Get('activity-levels')
  @Public()
  @ApiOperation({ summary: 'List activity levels' })
  @ApiResponse({ status: 200, type: CatalogListResponseDto })
  @ApiCrudErrorResponses()
  activityLevels(): CatalogListResponseDto {
    return this.catalogService.listActivityLevels();
  }

  @Get('education-levels')
  @Public()
  @ApiOperation({ summary: 'List education levels' })
  @ApiResponse({ status: 200, type: CatalogListResponseDto })
  @ApiCrudErrorResponses()
  educationLevels(): CatalogListResponseDto {
    return this.catalogService.listEducationLevels();
  }

  @Get('annual-income-levels')
  @Public()
  @ApiOperation({ summary: 'List annual income levels' })
  @ApiResponse({ status: 200, type: CatalogListResponseDto })
  @ApiCrudErrorResponses()
  annualIncomeLevels(): CatalogListResponseDto {
    return this.catalogService.listAnnualIncomeLevels();
  }

  @Get('dietary-preferences')
  @Public()
  @ApiOperation({
    summary: 'List dietary preferences',
  })
  @ApiResponse({ status: 200, type: CatalogListResponseDto })
  @ApiCrudErrorResponses()
  dietaryPreferences(): CatalogListResponseDto {
    return this.catalogService.listDietaryPreferences();
  }

  @Get('shopping-responsibilities')
  @Public()
  @ApiOperation({ summary: 'List shopping responsibility options' })
  @ApiResponse({ status: 200, type: CatalogListResponseDto })
  @ApiCrudErrorResponses()
  shoppingResponsibilities(): CatalogListResponseDto {
    return this.catalogService.listShoppingResponsibilities();
  }

  @Get('units')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'List units' })
  @ApiResponse({ status: 200, type: CatalogListResponseDto })
  @ApiCrudErrorResponses()
  units(): CatalogListResponseDto {
    return this.catalogService.listUnits();
  }

  @Get('type-of-meals')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'List type of meal values' })
  @ApiResponse({ status: 200, type: CatalogListResponseDto })
  @ApiCrudErrorResponses()
  typeOfMeals(): CatalogListResponseDto {
    return this.catalogService.listTypeOfMeals();
  }

  @Get('group-roles')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'List group roles' })
  @ApiResponse({ status: 200, type: CatalogListResponseDto })
  @ApiCrudErrorResponses()
  groupRoles(): CatalogListResponseDto {
    return this.catalogService.listGroupRoles();
  }

  @Get('languages')
  @Public()
  @ApiOperation({ summary: 'List languages (paginated)' })
  @ApiPaginationQuery()
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, type: PaginatedCatalogListResponseDto })
  @ApiCrudErrorResponses()
  languages(
    @Query() query: CatalogPaginatedQueryDto,
  ): PaginatedCatalogListResponseDto {
    return this.catalogService.listLanguages(query);
  }

  @Get('countries')
  @Public()
  @ApiOperation({ summary: 'List countries (paginated)' })
  @ApiPaginationQuery()
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, type: PaginatedCatalogListResponseDto })
  @ApiCrudErrorResponses()
  countries(
    @Query() query: CatalogPaginatedQueryDto,
  ): PaginatedCatalogListResponseDto {
    return this.catalogService.listCountries(query);
  }

  @Get('regions')
  @Public()
  @ApiOperation({ summary: 'List regions/subdivisions (paginated)' })
  @ApiPaginationQuery()
  @ApiQuery({
    name: 'countryCode',
    required: false,
    type: String,
    description:
      'ISO 3166-1 alpha-2 country code. Required unless search is provided (world-wide list is large).',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, type: PaginatedCatalogListResponseDto })
  @ApiCrudErrorResponses()
  regions(@Query() query: RegionsQueryDto): PaginatedCatalogListResponseDto {
    return this.catalogService.listRegions(query);
  }
}
