import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  NotFoundException,
  Delete,
  Query,
  Param,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from 'nest-keycloak-connect';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UserProfilesService } from '../services/user-profiles.service';
import { ProfileUpdateDto } from '../dto/profile-update.dto';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GamificationProfileService } from '../../gamification/services/gamification-profile.service';
import { ProgressWheelService } from '../../gamification/services/progress-wheel.service';
import { OnboardingSurveyService } from '../../gamification/services/onboarding-survey.service';
import { LearningProgressService } from '../../gamification/services/learning-progress.service';
import {
  DimensionProgressDto,
  KnowledgeProgressDto,
} from '../../gamification/dto/learning-progress.dto';
import {
  KNOWLEDGE_KINDS,
  KnowledgeKind,
} from '../../gamification/knowledge-progress.config';
import {
  GamificationProfileQueryDto,
  GamificationProfileResponseDto,
  WalletBalanceDto,
  UserEarnedRewardsDto,
} from '../../gamification/dto/gamification-profile.dto';
import { ProgressWheelDto } from '../../gamification/dto/progress-wheel.dto';
import {
  OnboardingSurveyAnswersDto,
  OnboardingSurveyDto,
  OnboardingSurveyResultDto,
} from '../../gamification/dto/onboarding-survey.dto';
import {
  RecordWheelImpactDto,
  RecordWheelImpactResultDto,
} from '../../gamification/dto/wheel-impact.dto';

@ApiTags('users')
@Controller('users')
export class UserProfilesController {
  constructor(
    private readonly userProfilesService: UserProfilesService,
    private readonly gamificationProfileService: GamificationProfileService,
    private readonly progressWheelService: ProgressWheelService,
    private readonly onboardingSurveyService: OnboardingSurveyService,
    private readonly learningProgressService: LearningProgressService,
  ) {}

  @Get('me')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Check whether basic profile is complete',
    description:
      'JSON boolean only. Full profile: `GET /users/me/profile`. Gamification: `GET /users/me/gamification`.',
  })
  @ApiOkResponse({ schema: { type: 'boolean' } })
  async getMyProfile(@CurrentUser('id') userId: string) {
    const user = await this.userProfilesService.getProfileByUserId(userId);
    if (!user) return false;
    return this.userProfilesService.isBasicProfileComplete(user.keycloakId);
  }

  @Get('me/profile')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMyFullProfile(@CurrentUser('id') userId: string) {
    const user = await this.userProfilesService.getProfileByUserId(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Get('me/gamification')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user gamification profile',
    description:
      'Wallet, progress indicators, preferences (incl. onboardingSurvey), quest, events.',
  })
  @ApiOkResponse({ type: GamificationProfileResponseDto })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  async getMyGamificationProfile(
    @CurrentUser('id') userId: string,
    @Query() query: GamificationProfileQueryDto,
  ): Promise<GamificationProfileResponseDto> {
    return this.gamificationProfileService.getProfileForUserId(userId, {
      eventsLimit: query.eventsLimit,
      walletEntriesLimit: query.walletEntriesLimit,
    });
  }

  @Get('me/gamification/progress-wheels')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get the four sustainability progress wheels',
    description:
      'CO2 reduction, energy reduction, water savings, land use reduction. ' +
      'Each wheel tracks the current stage (1-5) of the sustainability ' +
      'profile set by the onboarding survey; BEGINNER until the survey is ' +
      'submitted.',
  })
  @ApiOkResponse({ type: [ProgressWheelDto] })
  async getMyProgressWheels(
    @CurrentUser('id') userId: string,
  ): Promise<ProgressWheelDto[]> {
    return this.progressWheelService.getWheelsForUser(userId);
  }

  // Admin-only on purpose: wheels move automatically from meal logs (see
  // MealLogsService.recordWheelImpacts). Open to users, any client could
  // submit any actionCode any number of times and farm wheel progress and
  // segment promotion. Kept for testing/support and for actions with no
  // triggering event yet (packaging: REUSABLE_CONTAINER_USE, REFILL_PRODUCT).
  @Post('me/gamification/progress-wheels/impact')
  @Roles('admin')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      '[Admin] Record a validated action against your own progress wheels',
    description:
      "Adds the action's impact to every wheel it affects. A wheel that " +
      'crosses 100% archives its stage, rolls any excess into the next ' +
      'stage, and starts a new cycle. Completing stage 5 promotes the user ' +
      'segment (BEGINNER -> INTERMEDIATE -> ADVANCED) and resets all wheels ' +
      'to stage 1; before the onboarding survey stage 5 just repeats. ' +
      'Valid actionCodes are listed in the request body schema. ' +
      'Admin only: for users the wheels move automatically from meal logs.',
  })
  @ApiOkResponse({ type: RecordWheelImpactResultDto })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async recordProgressWheelImpact(
    @CurrentUser('id') userId: string,
    @Body() body: RecordWheelImpactDto,
  ): Promise<RecordWheelImpactResultDto> {
    return this.progressWheelService.recordImpact(userId, body.actionCode);
  }

  @Get('me/gamification/dimensions')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get the level and available quests per dimension',
    description:
      'One level per learning dimension, inferred from the onboarding survey ' +
      'and raised once the CO2, energy, water and land saved through that ' +
      "dimension's wheel actions all reach the level's targets. Each " +
      "dimension lists the quests at the user's level with their progress. " +
      'Empty until onboarding is done.',
  })
  @ApiOkResponse({ type: [DimensionProgressDto] })
  async getMyDimensions(
    @CurrentUser('id') userId: string,
  ): Promise<DimensionProgressDto[]> {
    return this.learningProgressService.listDimensions(userId);
  }

  @Get('me/gamification/dimensions/:code')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'code', example: 'DIET_CHANGES' })
  @ApiOperation({
    summary: 'Get one dimension with finished and open quest items',
  })
  @ApiOkResponse({ type: DimensionProgressDto })
  async getMyDimension(
    @CurrentUser('id') userId: string,
    @Param('code') code: string,
  ): Promise<DimensionProgressDto> {
    return this.learningProgressService.getDimension(userId, code);
  }

  @Get('me/gamification/knowledge-progress')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get the knowledge progress bars',
    description:
      'Health, food choices and food & waste: share of tagged items ' +
      '(missions, challenges, quizzes answered correctly, food facts read) ' +
      'finished across all quests, every dimension and level. The total ' +
      'is fixed, so a bar only grows.',
  })
  @ApiOkResponse({ type: [KnowledgeProgressDto] })
  async getMyKnowledgeProgress(
    @CurrentUser('id') userId: string,
  ): Promise<KnowledgeProgressDto[]> {
    return this.learningProgressService.listKnowledge(userId);
  }

  @Get('me/gamification/knowledge-progress/:kind')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'kind', enum: KNOWLEDGE_KINDS })
  @ApiOperation({
    summary: 'Get one knowledge bar with its finished and open items',
  })
  @ApiOkResponse({ type: KnowledgeProgressDto })
  async getMyKnowledgeBar(
    @CurrentUser('id') userId: string,
    @Param('kind') kind: string,
  ): Promise<KnowledgeProgressDto> {
    if (!(KNOWLEDGE_KINDS as string[]).includes(kind)) {
      throw new BadRequestException(
        `kind must be one of ${KNOWLEDGE_KINDS.join(', ')}`,
      );
    }
    return this.learningProgressService.getKnowledge(
      userId,
      kind as KnowledgeKind,
    );
  }

  @Get('me/gamification/onboarding-survey')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get the onboarding survey questions for the progress wheels',
    description:
      'Static 17-question survey grouped by learning dimension (4-5 options ' +
      'each). Answers map 1:1 to preferences.onboardingSurvey / the fields ' +
      'submitted via POST of this same route.',
  })
  @ApiOkResponse({ type: OnboardingSurveyDto })
  getOnboardingSurvey(): OnboardingSurveyDto {
    return {
      questions: [...this.onboardingSurveyService.getSurveyQuestions()],
    };
  }

  @Post('me/gamification/onboarding-survey')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Submit onboarding survey answers',
    description:
      'Every answer is optional (skipped questions are simply omitted). ' +
      'Scores each learning dimension from its answered questions, derives ' +
      'the sustainability profile (segment) from those levels (BEGINNER when ' +
      'nothing was answered), persists it with the answers, applies ' +
      'first-time onboarding side effects (wallet, progress wheels, ' +
      'per-dimension starting levels; idempotent), and returns the computed ' +
      'segment together with the resulting progress wheels.',
  })
  @ApiOkResponse({ type: OnboardingSurveyResultDto })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async submitOnboardingSurvey(
    @CurrentUser('id') userId: string,
    @Body() answers: OnboardingSurveyAnswersDto,
  ): Promise<OnboardingSurveyResultDto> {
    return this.onboardingSurveyService.submitSurvey(userId, answers);
  }

  @Get('me/wallet')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user wallet balance',
    description: 'Returns current XP and points balance.',
  })
  @ApiOkResponse({ type: WalletBalanceDto })
  async getMyWallet(
    @CurrentUser('id') userId: string,
  ): Promise<WalletBalanceDto> {
    return this.gamificationProfileService.getWalletBalance(userId);
  }

  @Get('me/rewards')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user earned rewards',
    description:
      'Returns all earned badges/rewards with full reward details (points, XP, items, etc.) sorted by most recent.',
  })
  @ApiOkResponse({ type: UserEarnedRewardsDto })
  async getMyEarnedRewards(
    @CurrentUser('id') userId: string,
  ): Promise<UserEarnedRewardsDto> {
    return this.gamificationProfileService.getEarnedRewards(userId);
  }

  @Patch('me')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Onboarding baselines under preferences.onboardingSurvey. Segment is chosen by the client at onboarding.',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() payload: ProfileUpdateDto,
  ) {
    const user = await this.userProfilesService.getProfileByUserId(userId);
    if (!user) throw new NotFoundException('User not found');

    const cleanedPayload = Object.fromEntries(
      Object.entries(payload ?? {}).filter(([, v]) => v !== undefined),
    );

    if (Object.keys(cleanedPayload).length === 0) {
      return user;
    }

    return this.userProfilesService.updateProfile(
      user.keycloakId,
      cleanedPayload,
    );
  }

  @Delete('me')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete current user account (optionally cascade all data)',
  })
  async deleteMe(
    @CurrentUser('id') userId: string,
    @Query('deleteAll') deleteAll: string = 'false',
  ) {
    const cascade = deleteAll === 'true';
    await this.userProfilesService.deleteUserById(userId, cascade);
    return { deleted: true, cascade };
  }
}
