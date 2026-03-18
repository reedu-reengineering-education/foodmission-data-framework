import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { ApiPaginationQuery } from '../../common/decorators/api-query-params.decorator';
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

@ApiTags('static-values')
@Controller('static-values')
export class StaticValuesController {
  constructor(private readonly staticValuesService: StaticValuesService) {}

  @Get('startup')
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
  @ApiOperation({ summary: 'List genders' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  genders(): StaticValuesListResponseDto {
    return this.staticValuesService.listGenders();
  }

  @Get('activity-levels')
  @ApiOperation({ summary: 'List activity levels' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  activityLevels(): StaticValuesListResponseDto {
    return this.staticValuesService.listActivityLevels();
  }

  @Get('education-levels')
  @ApiOperation({ summary: 'List education levels' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  educationLevels(): StaticValuesListResponseDto {
    return this.staticValuesService.listEducationLevels();
  }

  @Get('annual-income-levels')
  @ApiOperation({ summary: 'List annual income levels' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  annualIncomeLevels(): StaticValuesListResponseDto {
    return this.staticValuesService.listAnnualIncomeLevels();
  }

  @Get('dietary-preferences')
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
  @ApiOperation({ summary: 'List shopping responsibility options' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  shoppingResponsibilities(): StaticValuesListResponseDto {
    return this.staticValuesService.listShoppingResponsibilities();
  }

  @Get('units')
  @ApiOperation({ summary: 'List units' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  units(): StaticValuesListResponseDto {
    return this.staticValuesService.listUnits();
  }

  @Get('type-of-meals')
  @ApiOperation({ summary: 'List type of meal values' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  typeOfMeals(): StaticValuesListResponseDto {
    return this.staticValuesService.listTypeOfMeals();
  }

  @Get('meal-types')
  @ApiOperation({ summary: 'List meal types' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  mealTypes(): StaticValuesListResponseDto {
    return this.staticValuesService.listMealTypes();
  }

  @Get('group-roles')
  @ApiOperation({ summary: 'List group roles' })
  @ApiResponse({ status: 200, type: StaticValuesListResponseDto })
  @ApiCrudErrorResponses()
  groupRoles(): StaticValuesListResponseDto {
    return this.staticValuesService.listGroupRoles();
  }

  @Get('languages')
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
