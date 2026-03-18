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
  PaginatedStaticValuesListResponseDto,
  StaticValuesListResponseDto,
  StaticValuesStartupDataDto,
  StaticValuesStartupResponseDto,
} from '../dto/static-values-response.dto';
import {
  RegionsQueryDto,
  StaticValuesPaginatedQueryDto,
} from '../dto/static-values-query.dto';
import { StaticValuesService } from '../services/static-values.service';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

@ApiTags('static-values')
@Controller('static-values')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class StaticValuesController {
  constructor(private readonly staticValuesService: StaticValuesService) {}

  @Get('startup')
  @Public()
  @ApiOperation({
    summary:
      'Static values needed at regular app startup (excluding world geography)',
  })
  @ApiResponse({
    status: 200,
    description: 'Startup static values retrieved successfully',
    type: StaticValuesStartupResponseDto,
  })
  @ApiCrudErrorResponses()
  startup(): StaticValuesStartupResponseDto {
    return {
      data: {
        genders: this.staticValuesService.listGenders().data,
        activityLevels: this.staticValuesService.listActivityLevels().data,
        educationLevels: this.staticValuesService.listEducationLevels().data,
        annualIncomeLevels:
          this.staticValuesService.listAnnualIncomeLevels().data,
        dietaryPreferences:
          this.staticValuesService.listDietaryPreferencesPhase1().data,
        shoppingResponsibilities:
          this.staticValuesService.listShoppingResponsibilities().data,
      } satisfies StaticValuesStartupDataDto,
    };
  }

  @Get('genders')
  @Public()
  @ApiOperation({ summary: 'List genders' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  genders(): StaticValuesListResponseDto {
    return this.staticValuesService.listGenders();
  }

  @Get('activity-levels')
  @Public()
  @ApiOperation({ summary: 'List activity levels' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  activityLevels(): StaticValuesListResponseDto {
    return this.staticValuesService.listActivityLevels();
  }

  @Get('education-levels')
  @Public()
  @ApiOperation({ summary: 'List education levels' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  educationLevels(): StaticValuesListResponseDto {
    return this.staticValuesService.listEducationLevels();
  }

  @Get('annual-income-levels')
  @Public()
  @ApiOperation({ summary: 'List annual income levels' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  annualIncomeLevels(): StaticValuesListResponseDto {
    return this.staticValuesService.listAnnualIncomeLevels();
  }

  @Get('dietary-preferences')
  @Public()
  @ApiOperation({
    summary:
      'List dietary preferences (Phase 1: NONE/VEGAN/VEGETARIAN mapped to recipe tags)',
  })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  dietaryPreferences(): StaticValuesListResponseDto {
    return this.staticValuesService.listDietaryPreferencesPhase1();
  }

  @Get('shopping-responsibilities')
  @Public()
  @ApiOperation({ summary: 'List shopping responsibility options' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  shoppingResponsibilities(): StaticValuesListResponseDto {
    return this.staticValuesService.listShoppingResponsibilities();
  }

  @Get('units')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'List units' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  units(): StaticValuesListResponseDto {
    return this.staticValuesService.listUnits();
  }

  @Get('type-of-meals')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'List type of meal values' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  typeOfMeals(): StaticValuesListResponseDto {
    return this.staticValuesService.listTypeOfMeals();
  }

  @Get('meal-types')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'List meal types' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  mealTypes(): StaticValuesListResponseDto {
    return this.staticValuesService.listMealTypes();
  }

  @Get('group-roles')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'List group roles' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  groupRoles(): StaticValuesListResponseDto {
    return this.staticValuesService.listGroupRoles();
  }

  @Get('languages')
  @Public()
  @ApiOperation({ summary: 'List languages (paginated)' })
  @ApiPaginationQuery()
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, type: PaginatedStaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  languages(
    @Query() query: StaticValuesPaginatedQueryDto,
  ): PaginatedStaticValuesListResponseDto {
    return this.staticValuesService.listLanguages(query);
  }

  @Get('countries')
  @Public()
  @ApiOperation({ summary: 'List countries (paginated)' })
  @ApiPaginationQuery()
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, type: PaginatedStaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  countries(
    @Query() query: StaticValuesPaginatedQueryDto,
  ): PaginatedStaticValuesListResponseDto {
    return this.staticValuesService.listCountries(query);
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
  @ApiResponse({ status: 200, type: PaginatedStaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  regions(
    @Query() query: RegionsQueryDto,
  ): PaginatedStaticValuesListResponseDto {
    return this.staticValuesService.listRegions(query);
  }
}
