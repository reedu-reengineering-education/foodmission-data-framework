import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOAuth2,
} from '@nestjs/swagger';
import { Roles } from 'nest-keycloak-connect';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserPreferencesDto } from '../dto/user-preferences.dto';
import { ApiCommonErrorResponses } from '../../common/decorators/api-error-responses.decorator';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userRepository: UserRepository) {}

  @Post()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    conflict: true,
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userRepository.create(createUserDto);
  }

  @Get()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  async findAll() {
    return this.userRepository.findAll();
  }

  @Get(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    notFound: true,
  })
  async findOne(@Param('id') id: string) {
    return this.userRepository.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    notFound: true,
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userRepository.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    return this.userRepository.remove(id);
  }

  // @Get(':id/preferences')
  // @Roles('admin', 'user')
  // @ApiBearerAuth('JWT-auth')
  // @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  // @ApiOperation({ summary: 'Get user preferences' })
  // @ApiResponse({ status: 200, description: 'User preferences' })
  // async getPreferences(@Param('id') id: string) {
  //   const user = await this.userRepository.findById(id);
  //   if (!user) {
  //     throw new Error('User not found');
  //   }
  //   return user.preferences || {};
  // }

  // @Patch(':id/preferences')
  // @Roles('admin', 'user')
  // @ApiBearerAuth('JWT-auth')
  // @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  // @ApiOperation({ summary: 'Update user preferences' })
  // @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  // async updatePreferences(
  //   @Param('id') id: string,
  //   @Body() preferencesDto: UserPreferencesDto,
  // ) {
  //   const preferences = {
  //     dietaryRestrictions: preferencesDto.dietaryRestrictions || [],
  //     allergies: preferencesDto.allergies || [],
  //     preferredCategories: preferencesDto.preferredCategories || [],
  //   };

  //   return this.userRepository.update(id, { preferences });
  // }
}
