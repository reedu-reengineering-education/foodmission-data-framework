import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Public, Roles } from 'nest-keycloak-connect';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ShoppingListService } from '../services/shoppingList.service';
import { CreateShoppingListDto } from '../dto/create-shoppingList.dto';
import {
  ShoppingListResponseDto,
} from '../dto/shoppingList-response.dto';


@ApiTags('shoppinglist')
@Controller('shoppinglist')
@UseGuards(ThrottlerGuard)
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Post()
//  @Roles('user', 'admin')
 // @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) 
  @ApiOperation({
    summary: 'Create a new Shopping List',
    description:
      'Creates a new ShoppingList in the database. Requires user or admin role.',
  })
  @ApiBody({ type: CreateShoppingListDto })
  @ApiResponse({
    status: 201,
    description: 'Shopping list created successfully',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async create(
    @Body() createShoppingListDto: CreateShoppingListDto,
    @Request() req: any,
  ): Promise<ShoppingListResponseDto> {

    // const userId = req.user?.sub;
    // if (!userId) {
    //   throw new UnauthorizedException('User not authenticated');
    // }

 //   createShoppingListDto.userId = userId;

    return this.shoppingListService.create(createShoppingListDto);
  }

 
}
