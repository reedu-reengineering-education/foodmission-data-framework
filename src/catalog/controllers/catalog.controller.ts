import {
  applyDecorators,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';

function PublicCatalogList(summary: string) {
  return applyDecorators(
    Public(),
    ApiOperation({ summary }),
    ApiResponse({ status: 200, type: CatalogListResponseDto }),
    ApiCrudErrorResponses(),
  );
}

function ProtectedCatalogList(summary: string) {
  return applyDecorators(
    Roles('user', 'admin'),
    ApiBearerAuth('JWT-auth'),
    ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2'),
    ApiOperation({ summary }),
    ApiResponse({ status: 200, type: CatalogListResponseDto }),
    ApiCrudErrorResponses(),
  );
}

function PublicPaginatedCatalog(summary: string) {
  return applyDecorators(
    Public(),
    ApiOperation({ summary }),
    ApiPaginationQuery(),
    ApiQuery({ name: 'search', required: false, type: String }),
    ApiResponse({ status: 200, type: PaginatedCatalogListResponseDto }),
    ApiCrudErrorResponses(),
  );
}

@ApiTags('catalog')
@Controller('catalog')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
@ApiQuery({
  name: 'lang',
  required: false,
  type: String,
  enum: SUPPORTED_LOCALES,
  description: `Optional locale override for translated labels. Defaults to ${DEFAULT_LOCALE}.`,
})
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
  @PublicCatalogList('List genders')
  genders(): CatalogListResponseDto {
    return this.catalogService.listGenders();
  }

  @Get('activity-levels')
  @PublicCatalogList('List activity levels')
  activityLevels(): CatalogListResponseDto {
    return this.catalogService.listActivityLevels();
  }

  @Get('education-levels')
  @PublicCatalogList('List education levels')
  educationLevels(): CatalogListResponseDto {
    return this.catalogService.listEducationLevels();
  }

  @Get('annual-income-levels')
  @PublicCatalogList('List annual income levels')
  annualIncomeLevels(): CatalogListResponseDto {
    return this.catalogService.listAnnualIncomeLevels();
  }

  @Get('dietary-preferences')
  @PublicCatalogList('List dietary preferences')
  dietaryPreferences(): CatalogListResponseDto {
    return this.catalogService.listDietaryPreferences();
  }

  @Get('shopping-responsibilities')
  @PublicCatalogList('List shopping responsibility options')
  shoppingResponsibilities(): CatalogListResponseDto {
    return this.catalogService.listShoppingResponsibilities();
  }

  @Get('units')
  @ProtectedCatalogList('List units')
  units(): CatalogListResponseDto {
    return this.catalogService.listUnits();
  }

  @Get('type-of-meals')
  @ProtectedCatalogList('List type of meal values')
  typeOfMeals(): CatalogListResponseDto {
    return this.catalogService.listTypeOfMeals();
  }

  @Get('meal-categories')
  @ProtectedCatalogList('List meal categories')
  mealCategories(): CatalogListResponseDto {
    return this.catalogService.listMealCategories();
  }

  @Get('meal-courses')
  @ProtectedCatalogList('List meal courses')
  mealCourses(): CatalogListResponseDto {
    return this.catalogService.listMealCourses();
  }

  @Get('group-roles')
  @ProtectedCatalogList('List group roles')
  groupRoles(): CatalogListResponseDto {
    return this.catalogService.listGroupRoles();
  }

  @Get('weekly-meat-ranges')
  @PublicCatalogList('List weekly meat consumption ranges')
  weeklyMeatRanges(): CatalogListResponseDto {
    return this.catalogService.listWeeklyMeatRanges();
  }

  @Get('weekly-beef-frequencies')
  @PublicCatalogList('List weekly beef consumption frequencies')
  weeklyBeefFrequencies(): CatalogListResponseDto {
    return this.catalogService.listWeeklyBeefFrequencies();
  }

  @Get('weekly-food-waste-ranges')
  @PublicCatalogList('List weekly edible food waste ranges')
  weeklyFoodWasteRanges(): CatalogListResponseDto {
    return this.catalogService.listWeeklyFoodWasteRanges();
  }

  @Get('weekly-upf-ranges')
  @PublicCatalogList('List weekly UPF consumption ranges')
  weeklyUpfRanges(): CatalogListResponseDto {
    return this.catalogService.listWeeklyUpfRanges();
  }

  @Get('weekly-reusable-ranges')
  @PublicCatalogList(
    'List weekly reusable container / refill product usage ranges',
  )
  weeklyReusableRanges(): CatalogListResponseDto {
    return this.catalogService.listWeeklyReusableRanges();
  }

  @Get('user-segments')
  @PublicCatalogList('List user gamification segments')
  userSegments(): CatalogListResponseDto {
    return this.catalogService.listUserSegments();
  }

  @Get('motivations')
  @PublicCatalogList('List user motivations')
  motivations(): CatalogListResponseDto {
    return this.catalogService.listMotivations();
  }

  @Get('progress-indicator-kinds')
  @PublicCatalogList('List progress indicator kinds')
  progressIndicatorKinds(): CatalogListResponseDto {
    return this.catalogService.listProgressIndicatorKinds();
  }

  @Get('progress-precisions')
  @PublicCatalogList('List progress indicator precision types')
  progressPrecisions(): CatalogListResponseDto {
    return this.catalogService.listProgressPrecisions();
  }

  @Get('wallet-currencies')
  @PublicCatalogList('List gamification point currencies (XP, points)')
  walletCurrencies(): CatalogListResponseDto {
    return this.catalogService.listWalletCurrencies();
  }

  @Get('languages')
  @PublicPaginatedCatalog('List languages (paginated)')
  languages(
    @Query() query: CatalogPaginatedQueryDto,
  ): PaginatedCatalogListResponseDto {
    return this.catalogService.listLanguages(query);
  }

  @Get('countries')
  @PublicPaginatedCatalog('List countries (paginated)')
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
      'ISO 3166-1 alpha-2 country code. Optional; when omitted, regions across all countries are returned paginated.',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, type: PaginatedCatalogListResponseDto })
  @ApiCrudErrorResponses()
  regions(@Query() query: RegionsQueryDto): PaginatedCatalogListResponseDto {
    return this.catalogService.listRegions(query);
  }
}
