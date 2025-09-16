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
  Request,
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
  PaginatedShoppingListResponseDto,
  ShoppingListResponseDto,
} from '../dto/shoppingList-response.dto';
import { ShoppingListQueryDto } from '../dto/shoppingList-query.dto';
import { UpdateShoppingListDto } from '../dto/update.shoppingList.dto';


@ApiTags('shoppinglist')
@Controller('shoppinglist')
@UseGuards(ThrottlerGuard)
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Post()
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
    return this.shoppingListService.create(createShoppingListDto);
  }


  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get All Shoppinglists'
  })
  @ApiQuery({ name: 'search', required: false})
  @ApiResponse({
    status: 200,
    description: 'Shopping lists retrieved successfully',
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
  async findAll(@Query() query: ShoppingListQueryDto, 
): Promise<PaginatedShoppingListResponseDto> {
  return this.shoppingListService.findAll(query);
}


@Get(':id')
@Roles('user', 'admin')
@ApiBearerAuth('JWT-auth')
@ApiOperation({
  summary: 'Get specific shopping list by ID'
})
@ApiParam({ name: 'id', type: 'string', format: 'uuid' }) 
@ApiResponse({
  status: 200,
  description: 'Shopping list found',
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
async findById(
  @Param('id', ParseUUIDPipe) id: string,  
  @Request() req: any
): Promise<ShoppingListResponseDto> {
  const userId = req.user?.sub;  
  return this.shoppingListService.findById(id, userId);
}


@Patch(':id')
@Roles('user', 'admin')
@ApiBearerAuth('JWT-auth')
@ApiOperation({
  summary: 'Update shopping list'
})
@ApiParam({ name: 'id', type: 'string', format: 'uuid' }) 
@ApiResponse({
  status: 200,
  description: 'Shopping list found',
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
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShoppingListDto: UpdateShoppingListDto,
    @Request() req: any,
  ): Promise <ShoppingListResponseDto> {
      const userId = req.user?.sub; 
    return this.shoppingListService.update(id, updateShoppingListDto, userId);
  }
  
}
