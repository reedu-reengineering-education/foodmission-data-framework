import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserProfileService } from '../services/user-profile.service';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { ProfileUpdateDto } from '../dto/profile-update.dto';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('profile')
@Controller('profile')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get('me')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.userProfileService.getProfileByUserId(userId);
  }

  @Patch()
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update profile' })
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
    const user = await this.userProfileService.getProfileByUserId(userId);
    if (!user) throw new NotFoundException('User not found');

    const cleanedPayload: Record<string, any> = {};
    if (payload && typeof payload === 'object') {
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined) cleanedPayload[k] = v;
      }
    }

    if (Object.keys(cleanedPayload).length > 0) {
      return this.userProfileService.updateProfile(
        user.keycloakId,
        cleanedPayload,
      );
    }

    return user;
  }

  @Get('complete')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check whether basic profile is complete' })
  async isComplete(@CurrentUser('id') userId: string) {
    const user = await this.userProfileService.getProfileByUserId(userId);
    if (!user) return { complete: false };
    const ok = await this.userProfileService.isBasicProfileComplete(
      user.keycloakId,
    );
    return { complete: ok };
  }
}
