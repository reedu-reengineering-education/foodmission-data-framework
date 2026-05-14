import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
  InternalServerErrorException,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBody,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { WebhooksService } from './webhooks.service';
import {
  KeycloakAdminEventDto,
  KeycloakUserEventDto,
} from './dto/keycloak-event.dto';
import { createHmac, timingSafeEqual } from 'crypto';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Endpoint for receiving Keycloak events
   * Keycloak can send both user events and admin events to this endpoint
   */
  @Post('keycloak/events')
  @Public() // Keycloak webhooks don't use JWT authentication
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Keycloak events',
    description:
      'Webhook endpoint for receiving Keycloak user and admin events. ' +
      'Configure Keycloak Event Listeners to send events to this endpoint.',
  })
  @ApiHeader({
    name: 'X-Keycloak-Signature',
    description:
      'HMAC SHA256 signature for webhook verification (required if KEYCLOAK_WEBHOOK_SECRET is set)',
    required: false,
  })
  @ApiBody({
    description: 'Keycloak event payload (user event or admin event)',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/KeycloakUserEventDto' },
        { $ref: '#/components/schemas/KeycloakAdminEventDto' },
      ],
    },
  })
  @ApiOkResponse({
    description: 'Event received and processed successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'received' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to process event',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing webhook signature',
  })
  async handleKeycloakEvent(
    @Req() req: RawBodyRequest<Request>,
    @Body() event: KeycloakUserEventDto | KeycloakAdminEventDto,
    @Headers('X-Keycloak-Signature') signature?: string,
  ): Promise<{ status: string; timestamp: string }> {
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.KEYCLOAK_WEBHOOK_SECRET;
    if (webhookSecret) {
      if (!signature) {
        throw new UnauthorizedException('Missing webhook signature');
      }

      const rawBody = req.rawBody;
      if (!rawBody) {
        throw new InternalServerErrorException(
          'Unable to verify webhook signature',
        );
      }

      if (!this.verifySignature(rawBody, signature, webhookSecret)) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // Route to appropriate handler - errors will return 5xx to allow Keycloak retries
    // Unhandled event types return gracefully from the service (no error)
    if (this.isAdminEvent(event)) {
      await this.webhooksService.handleKeycloakAdminEvent(event);
    } else {
      await this.webhooksService.handleKeycloakUserEvent(event);
    }

    return {
      status: 'received',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Type guard to determine if the event is an admin event
   */
  private isAdminEvent(
    event: KeycloakUserEventDto | KeycloakAdminEventDto,
  ): event is KeycloakAdminEventDto {
    return 'operationType' in event && 'resourceType' in event;
  }

  /**
   * Verify HMAC SHA256 signature of the webhook payload
   * Uses timing-safe comparison to prevent timing attacks
   */
  private verifySignature(
    rawBody: Buffer,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    // Handle signature with or without prefix (e.g., "sha256=...")
    const providedSignature = signature.startsWith('sha256=')
      ? signature.slice(7)
      : signature;

    // Use timing-safe comparison to prevent timing attacks
    try {
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const providedBuffer = Buffer.from(providedSignature, 'hex');

      if (expectedBuffer.length !== providedBuffer.length) {
        return false;
      }

      return timingSafeEqual(expectedBuffer, providedBuffer);
    } catch {
      return false;
    }
  }
}
