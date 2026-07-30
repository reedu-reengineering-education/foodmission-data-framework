import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CreateClientEventDto } from '../dto/create-client-event.dto';
import { UserEventDto } from '../dto/user-event.dto';
import { ClientEventService } from '../services/client-event.service';

@ApiTags('events')
@Controller('events')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class EventsController {
  constructor(private readonly clientEventService: ClientEventService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({
    short: { limit: 2, ttl: 1_000 },
    medium: { limit: 30, ttl: 60_000 },
    long: { limit: 200, ttl: 900_000 },
  })
  @ApiOperation({
    summary: 'Record a client-allowlisted user event',
    description:
      'Accepts APP_SESSION_OPENED / APP_SESSION_ENDED only. ' +
      'Other event types must be derived server-side from domain mutations.',
  })
  @ApiBody({ type: CreateClientEventDto })
  @ApiResponse({
    status: 200,
    description: 'Event recorded (or replayed via idempotency key)',
    type: UserEventDto,
  })
  @ApiCrudErrorResponses()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateClientEventDto,
  ): Promise<UserEventDto> {
    const { event } = await this.clientEventService.record({
      userId,
      eventType: dto.eventType,
      metadata: dto.metadata,
      idempotencyKey: dto.idempotencyKey,
    });
    return event;
  }
}
