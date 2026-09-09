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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { UserProfilesService } from '../services/user-profiles.service';
import { ProfileUpdateDto } from '../dto/profile-update.dto';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GamificationProfileService } from '../../gamification/services/gamification-profile.service';
import { ProgressWheelService } from '../../gamification/services/progress-wheel.service';
import { OnboardingSurveyService } from '../../gamification/services/onboarding-survey.service';
import {
  GamificationProfileQueryDto,
  GamificationProfileResponseDto,
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
      'profile chosen at onboarding; empty until the user has a profile.',
  })
  @ApiOkResponse({ type: [ProgressWheelDto] })
  async getMyProgressWheels(
    @CurrentUser('id') userId: string,
  ): Promise<ProgressWheelDto[]> {
    return this.progressWheelService.getWheelsForUser(userId);
  }

  @Post('me/gamification/progress-wheels/impact')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Record a validated action against the progress wheels',
    description:
      "Adds the action's impact to every wheel it affects. A wheel that " +
      'crosses 100% archives its stage, rolls any excess into the next ' +
      'stage, and starts a new cycle. First draft: only VEGETARIAN_SERVING_100G ' +
      'is defined; more actions land as their impact values are supplied.',
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

  @Get('me/gamification/onboarding-survey')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get the onboarding survey questions for the progress wheels',
    description:
      'Static 5-question survey (habit frequency, 4 options each). Answers ' +
      'map 1:1 to preferences.onboardingSurvey / the fields submitted via ' +
      'POST of this same route.',
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
      'Computes the sustainability profile (dimension) from the 5 answers, ' +
      'persists it, applies first-time onboarding side effects (wallet + ' +
      'progress wheels, idempotent), and returns the computed segment ' +
      'together with the resulting progress wheels.',
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
