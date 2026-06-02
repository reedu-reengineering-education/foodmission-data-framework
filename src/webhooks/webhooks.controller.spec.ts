import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import {
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import {
  KeycloakUserEventDto,
  KeycloakAdminEventDto,
} from './dto/keycloak-event.dto';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let webhooksService: jest.Mocked<WebhooksService>;

  const originalEnv = process.env;

  beforeEach(async () => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    delete process.env.KEYCLOAK_WEBHOOK_SECRET;

    const mockWebhooksService: Partial<jest.Mocked<WebhooksService>> = {
      handleKeycloakUserEvent: jest.fn().mockResolvedValue(undefined),
      handleKeycloakAdminEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([])],
      controllers: [WebhooksController],
      providers: [
        {
          provide: WebhooksService,
          useValue: mockWebhooksService,
        },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    webhooksService = module.get(WebhooksService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('handleKeycloakEvent', () => {
    // Real-life example: user DELETE_ACCOUNT event
    const userDeleteEvent: KeycloakUserEventDto = {
      id: '41672906-9ff7-4e7a-be4f-d4951b3f2e93',
      time: 1776449710277,
      realmId: 'foodmission',
      realmName: 'foodmission',
      uid: '4787d525-a8ea-4730-b947-2d146165137a',
      authDetails: {
        realmId: 'foodmission',
        clientId: 'foodmission-api',
        userId: 'c6196fd4-ec5c-4298-a853-af16faf4adb4',
        ipAddress: '10.244.3.0',
        sessionId: '4a3ed820-efdc-41e0-9fc3-50833c169b51',
      },
      details: {
        auth_method: 'openid-connect',
        custom_required_action: 'delete_account',
        username: 'felixerdy',
      },
      type: 'access.DELETE_ACCOUNT',
    };

    // Real-life example: admin USER-DELETE event
    const adminDeleteEvent: KeycloakAdminEventDto = {
      id: '51afc443-7643-4c0b-8785-0cd2cdfd36c1',
      time: 1776448951654,
      realmId: 'foodmission',
      realmName: 'foodmission',
      operationType: 'DELETE',
      resourcePath: 'users/5742e900-998d-456a-84bd-6e9ac3b66d08',
      uid: 'c65cc924-9d64-41f8-8258-d5352fa9bda0',
      authDetails: {
        realmId: 'master',
        clientId: 'd38ff084-6e04-4bbb-8b85-ee6e82e33bb8',
        userId: 'af0f160d-a937-4149-8a18-652332d9ca50',
        ipAddress: '10.244.5.0',
        username: 'admin',
      },
      details: {
        userId: '5742e900-998d-456a-84bd-6e9ac3b66d08',
      },
      type: 'admin.USER-DELETE',
      resourceType: 'USER',
    };

    const createMockRequest = (body: object, rawBody?: Buffer) => ({
      rawBody: rawBody || Buffer.from(JSON.stringify(body)),
    });

    describe('without signature verification', () => {
      it('should process user event and return success response', async () => {
        const req = createMockRequest(userDeleteEvent);

        const result = await controller.handleKeycloakEvent(
          req as any,
          userDeleteEvent,
          undefined,
        );

        expect(result.status).toBe('received');
        expect(result.timestamp).toBeDefined();
        expect(webhooksService.handleKeycloakUserEvent).toHaveBeenCalledWith(
          userDeleteEvent,
        );
      });

      it('should process admin event and return success response', async () => {
        const req = createMockRequest(adminDeleteEvent);

        const result = await controller.handleKeycloakEvent(
          req as any,
          adminDeleteEvent,
          undefined,
        );

        expect(result.status).toBe('received');
        expect(result.timestamp).toBeDefined();
        expect(webhooksService.handleKeycloakAdminEvent).toHaveBeenCalledWith(
          adminDeleteEvent,
        );
      });

      it('should identify admin event by operationType and resourceType', async () => {
        const req = createMockRequest(adminDeleteEvent);

        await controller.handleKeycloakEvent(
          req as any,
          adminDeleteEvent,
          undefined,
        );

        expect(webhooksService.handleKeycloakAdminEvent).toHaveBeenCalled();
        expect(webhooksService.handleKeycloakUserEvent).not.toHaveBeenCalled();
      });

      it('should identify user event by absence of operationType', async () => {
        const req = createMockRequest(userDeleteEvent);

        await controller.handleKeycloakEvent(
          req as any,
          userDeleteEvent,
          undefined,
        );

        expect(webhooksService.handleKeycloakUserEvent).toHaveBeenCalled();
        expect(webhooksService.handleKeycloakAdminEvent).not.toHaveBeenCalled();
      });
    });

    describe('with signature verification', () => {
      const webhookSecret = 'test-webhook-secret';

      beforeEach(() => {
        process.env.KEYCLOAK_WEBHOOK_SECRET = webhookSecret;
      });

      it('should accept valid signature', async () => {
        const body = JSON.stringify(userDeleteEvent);
        const rawBody = Buffer.from(body);
        const signature = createHmac('sha256', webhookSecret)
          .update(rawBody)
          .digest('hex');

        const req = createMockRequest(userDeleteEvent, rawBody);

        const result = await controller.handleKeycloakEvent(
          req as any,
          userDeleteEvent,
          signature,
        );

        expect(result.status).toBe('received');
        expect(webhooksService.handleKeycloakUserEvent).toHaveBeenCalled();
      });

      it('should accept signature with sha256= prefix', async () => {
        const body = JSON.stringify(userDeleteEvent);
        const rawBody = Buffer.from(body);
        const signature =
          'sha256=' +
          createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

        const req = createMockRequest(userDeleteEvent, rawBody);

        const result = await controller.handleKeycloakEvent(
          req as any,
          userDeleteEvent,
          signature,
        );

        expect(result.status).toBe('received');
        expect(webhooksService.handleKeycloakUserEvent).toHaveBeenCalled();
      });

      it('should reject missing signature', async () => {
        const req = createMockRequest(userDeleteEvent);

        await expect(
          controller.handleKeycloakEvent(
            req as any,
            userDeleteEvent,
            undefined,
          ),
        ).rejects.toThrow(UnauthorizedException);

        expect(webhooksService.handleKeycloakUserEvent).not.toHaveBeenCalled();
      });

      it('should reject invalid signature', async () => {
        const body = JSON.stringify(userDeleteEvent);
        const rawBody = Buffer.from(body);
        const invalidSignature = 'invalid-signature-value';

        const req = createMockRequest(userDeleteEvent, rawBody);

        await expect(
          controller.handleKeycloakEvent(
            req as any,
            userDeleteEvent,
            invalidSignature,
          ),
        ).rejects.toThrow(UnauthorizedException);

        expect(webhooksService.handleKeycloakUserEvent).not.toHaveBeenCalled();
      });

      it('should reject signature with wrong secret', async () => {
        const body = JSON.stringify(userDeleteEvent);
        const rawBody = Buffer.from(body);
        const wrongSecretSignature = createHmac('sha256', 'wrong-secret')
          .update(rawBody)
          .digest('hex');

        const req = createMockRequest(userDeleteEvent, rawBody);

        await expect(
          controller.handleKeycloakEvent(
            req as any,
            userDeleteEvent,
            wrongSecretSignature,
          ),
        ).rejects.toThrow(UnauthorizedException);

        expect(webhooksService.handleKeycloakUserEvent).not.toHaveBeenCalled();
      });

      it('should throw InternalServerError if rawBody is not available', async () => {
        const req = { rawBody: undefined };

        await expect(
          controller.handleKeycloakEvent(
            req as any,
            userDeleteEvent,
            'some-signature',
          ),
        ).rejects.toThrow(InternalServerErrorException);

        expect(webhooksService.handleKeycloakUserEvent).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should propagate service errors as 5xx to allow Keycloak retries', async () => {
        webhooksService.handleKeycloakUserEvent.mockRejectedValue(
          new Error('Database error'),
        );

        const req = createMockRequest(userDeleteEvent);

        await expect(
          controller.handleKeycloakEvent(
            req as any,
            userDeleteEvent,
            undefined,
          ),
        ).rejects.toThrow('Database error');
      });

      it('should propagate admin event errors as 5xx to allow Keycloak retries', async () => {
        webhooksService.handleKeycloakAdminEvent.mockRejectedValue(
          new Error('Database error'),
        );

        const req = createMockRequest(adminDeleteEvent);

        await expect(
          controller.handleKeycloakEvent(
            req as any,
            adminDeleteEvent,
            undefined,
          ),
        ).rejects.toThrow('Database error');
      });
    });
  });
});
