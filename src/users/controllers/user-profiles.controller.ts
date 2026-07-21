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
    summary:
      'Check whether basic profile is complete (needs: username, yearOfBirth, country, region, zip, language)',
  })
  @ApiOkResponse({
    description: 'Whether basic profile is complete',
    schema: { type: 'boolean' },
  })
  async getMyProfile(@CurrentUser('id') userId: string) {
    const user = await this.userProfilesService.getProfileByUserId(userId);
    if (!user) return false;
    return this.userProfilesService.isBasicProfileComplete(user.keycloakId);
  }

  @Get('me/gamification')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user gamification profile',
    description:
      'Returns wallet balances, progress indicators, onboarding baselines, ' +
      'current quest id, and recent events / wallet entries. Badges are empty until Badge catalog exists.',
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
      'When all five gamification onboarding baselines are set (in this request or already on the profile), ' +
      'segment is derived if omitted, a wallet is ensured, and soft progress indicators are seeded.',
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

    const cleanedPayload: Record<string, any> = {};
    if (payload && typeof payload === 'object') {
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined) cleanedPayload[k] = v;
      }
    }

    if (Object.keys(cleanedPayload).length > 0) {
      return this.userProfilesService.updateProfile(
        user.keycloakId,
        cleanedPayload,
      );
    }

    return user;
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
