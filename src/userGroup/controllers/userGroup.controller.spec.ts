import { TestingModule } from '@nestjs/testing';
import { UserGroupController } from './userGroup.controller';
import { UserGroupService } from '../services/userGroup.service';
import { createControllerTestModule } from '../../common/test-utils/controller-test-helpers';
import { createMockUserGroupService } from '../test-utils/userGroup-service.mock';
import { UserGroupTestBuilder } from '../test-utils/userGroup-test-builders';
import { TEST_IDS, TEST_DATA } from '../../common/test-utils/test-constants';

describe('UserGroupController', () => {
  let controller: UserGroupController;
  let service: UserGroupService;
  let mockUserGroupService: ReturnType<typeof createMockUserGroupService>;

  beforeEach(async () => {
    mockUserGroupService = createMockUserGroupService();
    const module: TestingModule = await createControllerTestModule<
      UserGroupController,
      UserGroupService
    >({
      ControllerClass: UserGroupController,
      ServiceToken: UserGroupService,
      mockService: mockUserGroupService,
    });

    controller = module.get<UserGroupController>(UserGroupController);
    service = module.get<UserGroupService>(UserGroupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = TEST_IDS.USER;
    const createDto = UserGroupTestBuilder.createCreateUserGroupDto();
    const mockResponse = UserGroupTestBuilder.createUserGroupResponseDto();

    it('should call service with correct parameters and return result', async () => {
      mockUserGroupService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(createDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(createDto, userId);
      expect(service.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    const userId = TEST_IDS.USER;
    const mockResponse = UserGroupTestBuilder.createUserGroupResponseDtoArray(2);

    it('should call service with userId and return result', async () => {
      mockUserGroupService.findAllByUserId.mockResolvedValue(mockResponse);

      const result = await controller.findAll(userId);

      expect(result).toEqual(mockResponse);
      expect(service.findAllByUserId).toHaveBeenCalledWith(userId);
      expect(service.findAllByUserId).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;
    const mockResponse = UserGroupTestBuilder.createUserGroupResponseDto({
      id: groupId,
    });

    it('should call service with groupId and userId and return result', async () => {
      mockUserGroupService.findById.mockResolvedValue(mockResponse);

      const result = await controller.findOne(groupId, userId);

      expect(result).toEqual(mockResponse);
      expect(service.findById).toHaveBeenCalledWith(groupId, userId);
      expect(service.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;
    const updateDto = UserGroupTestBuilder.createUpdateUserGroupDto();
    const mockResponse = UserGroupTestBuilder.createUserGroupResponseDto({
      id: groupId,
      name: updateDto.name,
    });

    it('should call service with correct parameters and return result', async () => {
      mockUserGroupService.update.mockResolvedValue(mockResponse);

      const result = await controller.update(groupId, updateDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith(groupId, updateDto, userId);
      expect(service.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;

    it('should call service with correct parameters', async () => {
      mockUserGroupService.remove.mockResolvedValue(undefined);

      await controller.remove(groupId, userId);

      expect(service.remove).toHaveBeenCalledWith(groupId, userId);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('join', () => {
    const userId = TEST_IDS.USER;
    const inviteCode = TEST_DATA.INVITE_CODE;
    const mockResponse = UserGroupTestBuilder.createUserGroupResponseDto();

    it('should call service with invite code and return result', async () => {
      mockUserGroupService.joinByInviteCode.mockResolvedValue(mockResponse);

      const result = await controller.join({ inviteCode }, userId);

      expect(result).toEqual(mockResponse);
      expect(service.joinByInviteCode).toHaveBeenCalledWith(inviteCode, userId);
      expect(service.joinByInviteCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('leave', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;

    it('should call service with correct parameters', async () => {
      mockUserGroupService.leave.mockResolvedValue(undefined);

      await controller.leave(groupId, userId);

      expect(service.leave).toHaveBeenCalledWith(groupId, userId);
      expect(service.leave).toHaveBeenCalledTimes(1);
    });
  });

  describe('getInviteCode', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;
    const mockResponse = { inviteCode: TEST_DATA.INVITE_CODE };

    it('should call service and return invite code', async () => {
      mockUserGroupService.getInviteCode.mockResolvedValue(mockResponse);

      const result = await controller.getInviteCode(groupId, userId);

      expect(result).toEqual(mockResponse);
      expect(service.getInviteCode).toHaveBeenCalledWith(groupId, userId);
    });
  });

  describe('regenerateInviteCode', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;
    const mockResponse = { inviteCode: 'new-invite-code' };

    it('should call service and return new invite code', async () => {
      mockUserGroupService.regenerateInviteCode.mockResolvedValue(mockResponse);

      const result = await controller.regenerateInviteCode(groupId, userId);

      expect(result).toEqual(mockResponse);
      expect(service.regenerateInviteCode).toHaveBeenCalledWith(groupId, userId);
    });
  });

  describe('getMembers', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;
    const mockResponse = {
      members: [UserGroupTestBuilder.createGroupMemberResponseDto()],
      virtualMembers: [UserGroupTestBuilder.createVirtualMemberResponseDto()],
    };

    it('should call service and return members list', async () => {
      mockUserGroupService.getMembers.mockResolvedValue(mockResponse);

      const result = await controller.getMembers(groupId, userId);

      expect(result).toEqual(mockResponse);
      expect(service.getMembers).toHaveBeenCalledWith(groupId, userId);
    });
  });

  describe('addVirtualMember', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;
    const createDto = UserGroupTestBuilder.createCreateVirtualMemberDto();
    const mockResponse = UserGroupTestBuilder.createVirtualMemberResponseDto();

    it('should call service and return virtual member', async () => {
      mockUserGroupService.addVirtualMember.mockResolvedValue(mockResponse);

      const result = await controller.addVirtualMember(groupId, createDto, userId);

      expect(result).toEqual(mockResponse);
      expect(service.addVirtualMember).toHaveBeenCalledWith(
        groupId,
        createDto,
        userId,
      );
    });
  });
});
