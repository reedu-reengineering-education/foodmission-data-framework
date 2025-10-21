import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
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
import { CacheInterceptor } from '../../cache/cache.interceptor';
import { CacheEvictInterceptor } from '../../cache/cache-evict.interceptor';
import { Cacheable, CacheEvict } from '../../cache/decorators/cache.decorator';

@ApiTags('users')
@Controller('users')
@UseInterceptors(CacheInterceptor, CacheEvictInterceptor)
export class UserController {
  constructor(private readonly userRepository: UserRepository) {}

  @Post()
  @CacheEvict(['users:list'])
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userRepository.create(createUserDto);
  }

  @Get()
  @Cacheable('users_list', 300) // Cache for 5 minutes
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  async findAll() {
    return this.userRepository.findAll();
  }

  @Get(':id')
  @Cacheable('user_profile', 900) // Cache for 15 minutes
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.userRepository.findOne(id);
  }

  @Patch(':id')
  @CacheEvict(['user_profile:{id}', 'users:list'])
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userRepository.update(id, updateUserDto);
  }

  @Delete(':id')
  @CacheEvict(['user_profile:{id}', 'users:list'])
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    return this.userRepository.remove(id);
  }

  @Get(':id/preferences')
  @Cacheable('user_preferences', 600) // Cache for 10 minutes
  @Roles('admin', 'user')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiResponse({ status: 200, description: 'User preferences' })
  async getPreferences(@Param('id') id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user.preferences || {};
  }

  @Get(':id/chekedShoppingListItemInPantry')
  @Cacheable('user_cheked shopping list item in pantry', 600)
  @Roles('admin', 'user')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Get user cheked if shopping list item in pantry' })
  @ApiResponse({
    status: 200,
    description: 'User cheked shopping list item in pantry',
  })
  async getChekedShoppingListItemInPantry(@Param('id') id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user.chekedShoppingListItemInPantry || {};
  }

  @Patch(':id/preferences')
  @CacheEvict(['user_profile:{id}', 'user_preferences:{id}'])
  @Roles('admin', 'user')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @Param('id') id: string,
    @Body() preferencesDto: UserPreferencesDto,
  ) {
    const preferences = {
      dietaryRestrictions: preferencesDto.dietaryRestrictions || [],
      allergies: preferencesDto.allergies || [],
      preferredCategories: preferencesDto.preferredCategories || [],
    };

    return this.userRepository.update(id, { preferences });
  }
}
