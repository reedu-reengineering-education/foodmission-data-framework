import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { ConsentsService } from '../services/consents.service';
import { ConsentFormDto, ConsentQueryDto } from '../dto/consent.dto';

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
      'Returns active consent forms (seeded catalog). Pass ?lang= for translations. Accept via PATCH /users/me settings.consents.',
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
}
