import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../common/guards/database-auth.guards';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller('catalog')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('meal-categories')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get available meal categories' })
  @ApiResponse({ status: 200, description: 'Meal categories' })
  getMealCategories() {
    return this.catalogService.getMealCategories();
  }

  @Get('meal-courses')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get available meal courses' })
  @ApiResponse({ status: 200, description: 'Meal courses' })
  getMealCourses() {
    return this.catalogService.getMealCourses();
  }

  @Get('dietary-labels')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get available dietary labels' })
  @ApiResponse({ status: 200, description: 'Dietary labels' })
  getDietaryLabels() {
    return this.catalogService.getDietaryLabels();
  }
}
