import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChallengeProgressService } from '../services/challenge-progress.service';
import { ChallengeProgressResponseDto } from '../dto/response-challenge-progress.dto';
import { UpdateChallengeProgressDto } from '../dto/update-challenge-progress.dto';

@ApiTags('challenges')
@Controller('challenges/:challengeId/progress')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
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
  ): Promise<ChallengeProgressResponseDto> {
    return this.challengeProgressService.getChallengeById(challengeId, userId);
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
