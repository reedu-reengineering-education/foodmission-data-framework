import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  NotFoundException,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { UserProfilesService } from '../services/user-profiles.service';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { ProfileUpdateDto } from '../dto/profile-update.dto';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
export class UserProfilesController {
  constructor(private readonly userProfilesService: UserProfilesService) {}

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

  @Patch('me')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current user profile' })
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
