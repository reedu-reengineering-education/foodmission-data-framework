import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AcceptLegalConsentDto,
  AcceptLegalConsentResponseDto,
  LegalConsentStatusResponseDto,
  LegalDocumentParamsDto,
  LegalDocumentResponseDto,
  LegalLocaleQueryDto,
} from '../dto/legal.dto';
import { SkipLegalConsent } from '../guards/legal-consent.guard';
import { LegalService } from '../services/legal.service';
import { Public } from 'nest-keycloak-connect';

@ApiTags('legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('documents/latest/:docType')
  @ApiOperation({
    summary: 'Get latest published legal document by type and locale',
  })
  @ApiOkResponse({ type: LegalDocumentResponseDto })
  @ApiNotFoundResponse({ description: 'No published document found' })
  @Public()
  async getLatestDocument(
    @Param() params: LegalDocumentParamsDto,
    @Query() query: LegalLocaleQueryDto,
  ): Promise<LegalDocumentResponseDto> {
    return this.legalService.getLatestDocument(params.docType, query.locale);
  }

  @Get('documents/required')
  @ApiOperation({
    summary: 'Get latest required legal documents (Terms + Privacy)',
  })
  @ApiOkResponse({ type: [LegalDocumentResponseDto] })
  @Public()
  async getRequiredDocuments(
    @Query() query: LegalLocaleQueryDto,
  ): Promise<LegalDocumentResponseDto[]> {
    return this.legalService.getRequiredDocuments(query.locale);
  }

  @Get('consents/me/status')
  @UseGuards(DataBaseAuthGuard)
  @SkipLegalConsent()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Check if current user must accept newer legal documents',
  })
  @ApiOkResponse({ type: LegalConsentStatusResponseDto })
  async getMyConsentStatus(
    @CurrentUser('id') userId: string,
    @Query() query: LegalLocaleQueryDto,
  ): Promise<LegalConsentStatusResponseDto> {
    return this.legalService.getConsentStatus(userId, query.locale);
  }

  @Post('consents/me/accept')
  @UseGuards(DataBaseAuthGuard)
  @SkipLegalConsent()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Accept a legal document for the current user',
  })
  @ApiOkResponse({ type: AcceptLegalConsentResponseDto })
  async acceptMyConsent(
    @CurrentUser('id') userId: string,
    @Body() body: AcceptLegalConsentDto,
  ): Promise<AcceptLegalConsentResponseDto> {
    return this.legalService.acceptDocument(userId, body.documentKey);
  }
}
