import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { LangQueryDto } from '../../i18n/dto/lang-query.dto';
import { ChallengeProgressService } from '../services/challenge-progress.service';
import { ChallengeProgressResponseDto } from '../dto/response-challenge-progress.dto';
import { UpdateChallengeProgressDto } from '../dto/update-challenge-progress.dto';

@ApiTags('challenges')
@Controller('challenges/:challengeId/progress')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
@ApiQuery({
  name: 'lang',
  required: false,
  type: String,
  enum: SUPPORTED_LOCALES,
  description: `Optional locale override for translated challenge copy. Defaults to ${DEFAULT_LOCALE}.`,
})
export class ChallengeProgressController {
  constructor(
    private readonly challengeProgressService: ChallengeProgressService,
  ) {}

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get challenge progress by challenge ID',
    description:
      'Retrieves the progress of a specific challenge for the authenticated user.',
  })
  @ApiParam({ name: 'challengeId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Challenge progress retrieved successfully',
    type: ChallengeProgressResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No permission',
  })
  @ApiResponse({
    status: 404,
    description: 'Challenge progress not found',
  })
  @ApiCrudErrorResponses()
  async getChallengeById(
    @Param('challengeId', ParseUUIDPipe) challengeId: string,
    @CurrentUser('id') userId: string,
    @Query() query: LangQueryDto,
  ): Promise<ChallengeProgressResponseDto> {
    return this.challengeProgressService.getChallengeById(
      challengeId,
      userId,
      query.lang,
    );
  }

  @Patch()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update challenge progress',
    description:
      'Updates the progress or completion status of a specific challenge for the authenticated user.',
  })
  @ApiParam({ name: 'challengeId', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateChallengeProgressDto })
  @ApiResponse({
    status: 200,
    description: 'Challenge progress updated successfully',
    type: ChallengeProgressResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No permission - user does not own this challenge progress',
  })
  @ApiResponse({
    status: 404,
    description: 'Challenge progress not found',
  })
  @ApiCrudErrorResponses()
  async update(
    @Param('challengeId', ParseUUIDPipe) challengeId: string,
    @Body() updateChallengeProgressDto: UpdateChallengeProgressDto,
    @CurrentUser('id') userId: string,
  ): Promise<ChallengeProgressResponseDto> {
    return this.challengeProgressService.update(
      challengeId,
      updateChallengeProgressDto,
      userId,
    );
  }
}
