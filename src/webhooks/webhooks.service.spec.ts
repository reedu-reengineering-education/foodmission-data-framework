import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { UserProfilesService } from '../users/services/user-profiles.service';
import {
  KeycloakUserEventDto,
  KeycloakAdminEventDto,
} from './dto/keycloak-event.dto';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let userProfilesService: jest.Mocked<UserProfilesService>;

  beforeEach(async () => {
    const mockUserProfilesService: Partial<jest.Mocked<UserProfilesService>> = {
      deleteUserByKeycloakId: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: UserProfilesService,
          useValue: mockUserProfilesService,
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    userProfilesService = module.get(UserProfilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleKeycloakUserEvent', () => {
    describe('DELETE_ACCOUNT event', () => {
      // Real-life example from Keycloak
      const deleteAccountEvent: KeycloakUserEventDto = {
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
          response_type: 'code',
          redirect_uri: 'http://localhost:3000/',
          remember_me: 'false',
          code_id: '4a3ed820-efdc-41e0-9fc3-50833c169b51',
          response_mode: 'query',
          username: 'felixerdy',
        },
        type: 'access.DELETE_ACCOUNT',
      };

      it('should call deleteUserByKeycloakId with correct userId', async () => {
        await service.handleKeycloakUserEvent(deleteAccountEvent);

        expect(userProfilesService.deleteUserByKeycloakId).toHaveBeenCalledWith(
          'c6196fd4-ec5c-4298-a853-af16faf4adb4',
        );
        expect(userProfilesService.deleteUserByKeycloakId).toHaveBeenCalledTimes(
          1,
        );
      });

      it('should not call deleteUserByKeycloakId if userId is missing', async () => {
        const eventWithoutUserId: KeycloakUserEventDto = {
          ...deleteAccountEvent,
          authDetails: {
            ...deleteAccountEvent.authDetails,
            userId: undefined,
          },
        };

        await service.handleKeycloakUserEvent(eventWithoutUserId);

        expect(
          userProfilesService.deleteUserByKeycloakId,
        ).not.toHaveBeenCalled();
      });

      it('should handle second DELETE_ACCOUNT event example', async () => {
        const secondDeleteEvent: KeycloakUserEventDto = {
          id: '1de10add-62a5-4630-92ee-c3aac0a8f19a',
          time: 1776449243325,
          realmId: 'foodmission',
          realmName: 'foodmission',
          uid: 'bccf4214-105c-4973-9031-ec78673e57dd',
          authDetails: {
            realmId: 'foodmission',
            clientId: 'foodmission-api',
            userId: '53851fd0-56a0-4892-9bd0-364fd37daf03',
            ipAddress: '10.244.5.0',
            sessionId: '1022088c-3e79-4a8e-8baa-7805ced8280d',
          },
          details: {
            auth_method: 'openid-connect',
            custom_required_action: 'delete_account',
            response_type: 'code',
            redirect_uri: 'http://localhost:3000/',
            remember_me: 'false',
            code_id: '1022088c-3e79-4a8e-8baa-7805ced8280d',
            response_mode: 'query',
            username: 'felixerdy',
          },
          type: 'access.DELETE_ACCOUNT',
        };

        await service.handleKeycloakUserEvent(secondDeleteEvent);

        expect(userProfilesService.deleteUserByKeycloakId).toHaveBeenCalledWith(
          '53851fd0-56a0-4892-9bd0-364fd37daf03',
        );
      });
    });

    describe('unhandled events', () => {
      it('should not call deleteUserByKeycloakId for LOGIN event', async () => {
        const loginEvent: KeycloakUserEventDto = {
          id: 'bf944c06-74eb-46b7-8f1f-3461ac1ae8f2',
          time: 1776449105753,
          realmId: 'foodmission',
          realmName: 'foodmission',
          uid: '2a5d0832-f78a-46e6-85b1-1dcb03324045',
          authDetails: {
            realmId: 'foodmission',
            clientId: 'account-console',
            userId: '53851fd0-56a0-4892-9bd0-364fd37daf03',
            ipAddress: '10.244.5.0',
            username: 'felixerdy',
            sessionId: '97b78cc4-6fc5-4ef1-9553-c5c233a64e35',
          },
          details: {
            auth_method: 'openid-connect',
            auth_type: 'code',
            redirect_uri:
              'https://test.auth.foodmission.eu/realms/foodmission/account/',
            consent: 'no_consent_required',
            code_id: '97b78cc4-6fc5-4ef1-9553-c5c233a64e35',
            username: 'felixerdy',
          },
          type: 'access.LOGIN',
        };

        await service.handleKeycloakUserEvent(loginEvent);

        expect(
          userProfilesService.deleteUserByKeycloakId,
        ).not.toHaveBeenCalled();
      });

      it('should not call deleteUserByKeycloakId for CODE_TO_TOKEN event', async () => {
        const codeToTokenEvent: KeycloakUserEventDto = {
          id: '63b696b9-a642-4181-a0db-2f7cd63664a7',
          time: 1776449106352,
          realmId: 'foodmission',
          realmName: 'foodmission',
          uid: 'af4f176b-e818-490e-88a4-df0066dd3c94',
          authDetails: {
            realmId: 'foodmission',
            clientId: 'account-console',
            userId: '53851fd0-56a0-4892-9bd0-364fd37daf03',
            ipAddress: '10.244.5.0',
            username: 'felixerdy',
            sessionId: '97b78cc4-6fc5-4ef1-9553-c5c233a64e35',
          },
          details: {
            token_id: 'onrtac:6067b66c-ae57-3331-40b1-ff8920159a85',
            grant_type: 'authorization_code',
            refresh_token_type: 'Refresh',
            scope: 'openid email profile roles',
            refresh_token_id: '7399e176-8c12-69ae-2da6-d1bf105060ed',
            code_id: '97b78cc4-6fc5-4ef1-9553-c5c233a64e35',
            client_auth_method: 'client-secret',
          },
          type: 'access.CODE_TO_TOKEN',
        };

        await service.handleKeycloakUserEvent(codeToTokenEvent);

        expect(
          userProfilesService.deleteUserByKeycloakId,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('handleKeycloakAdminEvent', () => {
    describe('USER-DELETE event', () => {
      // Real-life example from Keycloak admin console
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

      it('should call deleteUserByKeycloakId with userId from details', async () => {
        await service.handleKeycloakAdminEvent(adminDeleteEvent);

        expect(userProfilesService.deleteUserByKeycloakId).toHaveBeenCalledWith(
          '5742e900-998d-456a-84bd-6e9ac3b66d08',
        );
        expect(userProfilesService.deleteUserByKeycloakId).toHaveBeenCalledTimes(
          1,
        );
      });

      it('should extract userId from resourcePath if details.userId is missing', async () => {
        const eventWithoutDetailsUserId: KeycloakAdminEventDto = {
          ...adminDeleteEvent,
          details: {},
        };

        await service.handleKeycloakAdminEvent(eventWithoutDetailsUserId);

        expect(userProfilesService.deleteUserByKeycloakId).toHaveBeenCalledWith(
          '5742e900-998d-456a-84bd-6e9ac3b66d08',
        );
      });

      it('should handle event with operationType DELETE and resourceType USER', async () => {
        const deleteByOperationType: KeycloakAdminEventDto = {
          ...adminDeleteEvent,
          type: 'admin.SOME_OTHER_TYPE', // Different type but correct operationType
        };

        await service.handleKeycloakAdminEvent(deleteByOperationType);

        expect(userProfilesService.deleteUserByKeycloakId).toHaveBeenCalledWith(
          '5742e900-998d-456a-84bd-6e9ac3b66d08',
        );
      });

      it('should not call deleteUserByKeycloakId if userId cannot be determined', async () => {
        const eventWithoutUserId: KeycloakAdminEventDto = {
          ...adminDeleteEvent,
          details: {},
          resourcePath: undefined,
        };

        await service.handleKeycloakAdminEvent(eventWithoutUserId);

        expect(
          userProfilesService.deleteUserByKeycloakId,
        ).not.toHaveBeenCalled();
      });
    });

    describe('unhandled admin events', () => {
      it('should not call deleteUserByKeycloakId for CREATE operation', async () => {
        const createEvent: KeycloakAdminEventDto = {
          id: 'create-event-id',
          time: 1776448951654,
          realmId: 'foodmission',
          operationType: 'CREATE',
          resourcePath: 'users/new-user-id',
          type: 'admin.USER-CREATE',
          resourceType: 'USER',
        };

        await service.handleKeycloakAdminEvent(createEvent);

        expect(
          userProfilesService.deleteUserByKeycloakId,
        ).not.toHaveBeenCalled();
      });

      it('should not call deleteUserByKeycloakId for UPDATE operation', async () => {
        const updateEvent: KeycloakAdminEventDto = {
          id: 'update-event-id',
          time: 1776448951654,
          realmId: 'foodmission',
          operationType: 'UPDATE',
          resourcePath: 'users/existing-user-id',
          type: 'admin.USER-UPDATE',
          resourceType: 'USER',
        };

        await service.handleKeycloakAdminEvent(updateEvent);

        expect(
          userProfilesService.deleteUserByKeycloakId,
        ).not.toHaveBeenCalled();
      });

      it('should not process non-USER resource types', async () => {
        const roleEvent: KeycloakAdminEventDto = {
          id: 'role-event-id',
          time: 1776448951654,
          realmId: 'foodmission',
          operationType: 'DELETE',
          resourcePath: 'roles/some-role',
          type: 'admin.ROLE-DELETE',
          resourceType: 'ROLE',
        };

        await service.handleKeycloakAdminEvent(roleEvent);

        expect(
          userProfilesService.deleteUserByKeycloakId,
        ).not.toHaveBeenCalled();
      });
    });
  });
});
