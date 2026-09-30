import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LearningLangQueryDto } from '../../learning/dto/learning-lang-query.dto';
import { BadgesService } from '../services/badges.service';
import {
  BadgeDto,
  BadgesResponseDto,
  UserBadgesResponseDto,
} from '../dto/badge-response.dto';

/**
 * Read-only on purpose. Badges are awarded from the event ledger by
 * BadgeRulesService; there is no route that grants one, so a client cannot
 * mint itself a badge by replaying a request.
 */
@ApiTags('badges')
@Controller('badges')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List the badge catalog',
    description:
      'Every available badge, in gallery order, without user state. For the current user’s progress use GET /badges/me.',
  })
  @ApiResponse({ status: 200, type: BadgesResponseDto })
  @ApiCrudErrorResponses()
  async list(@Query() query: LearningLangQueryDto): Promise<BadgesResponseDto> {
    return this.badgesService.listCatalog(query.lang);
  }

  @Get('me')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List badges with the current user’s progress',
    description:
      'The full catalog annotated with `earned`, `earnedAt`, `progress` (0–100) and the `counters` behind it, so locked badges can be shown alongside earned ones.',
  })
  @ApiResponse({ status: 200, type: UserBadgesResponseDto })
  @ApiCrudErrorResponses()
  async listMine(
    @CurrentUser('id') userId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<UserBadgesResponseDto> {
    return this.badgesService.listForUser(userId, query.lang);
  }

  @Get(':code')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a badge by code' })
  @ApiParam({ name: 'code', example: 'CHEF' })
  @ApiResponse({ status: 200, type: BadgeDto })
  @ApiCrudErrorResponses()
  async getOne(
    @Param('code') code: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<BadgeDto> {
    return this.badgesService.getByCode(code, query.lang);
  }
}
