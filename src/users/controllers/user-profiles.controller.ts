import {
  Controller,
  Get,
  Patch,
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
import {
  GamificationProfileQueryDto,
  GamificationProfileResponseDto,
} from '../../gamification/dto/gamification-profile.dto';

@ApiTags('users')
@Controller('users')
export class UserProfilesController {
  constructor(
    private readonly userProfilesService: UserProfilesService,
    private readonly gamificationProfileService: GamificationProfileService,
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
