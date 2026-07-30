import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { ConsentsService } from '../services/consents.service';
import {
  AcceptConsentDto,
  ConsentFormDto,
  ConsentQueryDto,
  CreateConsentFormDto,
  UpdateConsentFormDto,
  UserConsentDto,
  UserConsentStatusDto,
} from '../dto/consent.dto';

@ApiTags('Consents')
@Controller('consents')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List active consent forms',
    description:
      'Returns active consent forms. Pass ?lang= to resolve title/body translations.',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SUPPORTED_LOCALES,
    description: `Optional locale. Defaults to ${DEFAULT_LOCALE}.`,
  })
  @ApiResponse({ status: 200, type: [ConsentFormDto] })
  async listForms(@Query() query: ConsentQueryDto): Promise<ConsentFormDto[]> {
    return this.consentsService.listForms(query.lang);
  }

  @Get('me')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user consent status',
    description:
      'Derived from User.settings.consents against active required/optional forms.',
  })
  @ApiResponse({ status: 200, type: [UserConsentStatusDto] })
  async getMyConsentStatus(
    @CurrentUser('id') userId: string,
  ): Promise<UserConsentStatusDto[]> {
    return this.consentsService.getUserConsentStatus(userId);
  }

  @Post('me')
  @Roles('user', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Accept a consent form',
    description:
      'Stores acceptance under User.settings.consents. Locale from ?lang= (defaults to en).',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SUPPORTED_LOCALES,
    description: `Locale of the text shown to the user. Defaults to ${DEFAULT_LOCALE}.`,
  })
  @ApiBody({ type: AcceptConsentDto })
  @ApiResponse({ status: 201, type: UserConsentDto })
  @ApiCrudErrorResponses()
  async acceptConsent(
    @CurrentUser('id') userId: string,
    @Body() body: AcceptConsentDto,
    @Query() query: ConsentQueryDto,
  ): Promise<UserConsentDto> {
    return this.consentsService.acceptConsent(userId, body, query.lang);
  }

  @Get(':key')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'key', example: 'privacy_notice' })
  @ApiOperation({ summary: 'Get consent form by key' })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SUPPORTED_LOCALES,
    description: `Optional locale. Defaults to ${DEFAULT_LOCALE}.`,
  })
  @ApiResponse({ status: 200, type: ConsentFormDto })
  @ApiCrudErrorResponses()
  async getForm(
    @Param('key') key: string,
    @Query() query: ConsentQueryDto,
  ): Promise<ConsentFormDto> {
    return this.consentsService.getFormByKey(key, query.lang);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a consent form',
    description: 'Admin only. Creates a form with English title/body.',
  })
  @ApiBody({ type: CreateConsentFormDto })
  @ApiResponse({ status: 201, type: ConsentFormDto })
  @ApiCrudErrorResponses()
  async createForm(
    @Body() body: CreateConsentFormDto,
  ): Promise<ConsentFormDto> {
    return this.consentsService.createForm(body);
  }

  @Patch(':key')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'key', example: 'privacy_notice' })
  @ApiOperation({
    summary: 'Update a consent form',
    description:
      'Admin only. Updates metadata and/or English title/body in place.',
  })
  @ApiBody({ type: UpdateConsentFormDto })
  @ApiResponse({ status: 200, type: ConsentFormDto })
  @ApiCrudErrorResponses()
  async updateForm(
    @Param('key') key: string,
    @Body() body: UpdateConsentFormDto,
  ): Promise<ConsentFormDto> {
    return this.consentsService.updateForm(key, body);
  }
}
