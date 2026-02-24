import { Test, TestingModule } from '@nestjs/testing';
import { UserGroupService } from './userGroup.service';
import { UserGroupRepository } from '../repositories/userGroup.repository';
import { GroupMembershipRepository } from '../repositories/groupMembership.repository';
import { GroupRole } from '@prisma/client';
import { UserGroupTestBuilder } from '../test-utils/userGroup-test-builders';
import { TEST_IDS, TEST_DATA } from '../../common/test-utils/test-constants';
import {
  GroupNotFoundException,
  GroupMemberNotFoundException,
  NotGroupMemberException,
  GroupAdminRequiredException,
  GroupAlreadyMemberException,
  InvalidInviteCodeException,
  LastAdminCannotLeaveException,
  CannotUpdateRegisteredUserException,
  UseSelfLeaveEndpointException,
  VirtualMemberCannotBeAdminException,
  AlreadyAdminException,
} from '../../common/exceptions/business.exception';

describe('UserGroupService', () => {
  let service: UserGroupService;

  const mockUserGroupRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByInviteCode: jest.fn(),
    findAllByUserId: jest.fn(),
    update: jest.fn(),
    regenerateInviteCode: jest.fn(),
    delete: jest.fn(),
  };

  const mockMembershipRepository = {
    create: jest.fn(),
    findByUserAndGroup: jest.fn(),
    findById: jest.fn(),
    findAllByGroupId: jest.fn(),
    updateRole: jest.fn(),
    updateRoleById: jest.fn(),
    delete: jest.fn(),
    deleteById: jest.fn(),
    countAdmins: jest.fn(),
    countMembers: jest.fn(),
    createVirtualMember: jest.fn(),
    updateVirtualMember: jest.fn(),
    isVirtual: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGroupService,
        {
          provide: UserGroupRepository,
          useValue: mockUserGroupRepository,
        },
        {
          provide: GroupMembershipRepository,
          useValue: mockMembershipRepository,
        },
      ],
    }).compile();

    service = module.get<UserGroupService>(UserGroupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = TEST_IDS.USER;
    const createDto = UserGroupTestBuilder.createCreateUserGroupDto();

    it('should create a group and return it', async () => {
      const mockGroup = {
        id: TEST_IDS.USER_GROUP,
        name: createDto.name,
        description: createDto.description,
        inviteCode: TEST_DATA.INVITE_CODE,
        createdBy: userId,
        createdAt: new Date(),
        memberships: [],
      };
      mockUserGroupRepository.create.mockResolvedValue(mockGroup);

      const result = await service.create(createDto, userId);

      expect(result.id).toBe(TEST_IDS.USER_GROUP);
      expect(result.name).toBe(createDto.name);
      expect(mockUserGroupRepository.create).toHaveBeenCalledWith({
        ...createDto,
        createdBy: userId,
      });
    });
  });

  describe('findById', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;

    it('should return group when user is a member', async () => {
      const mockGroup = {
        id: groupId,
        name: TEST_DATA.GROUP_NAME,
        memberships: [],
        virtualMembers: [],
      };
      const mockMembership = { userId, groupId, role: GroupRole.MEMBER };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );

      const result = await service.findById(groupId, userId);

      expect(result.id).toBe(groupId);
    });

    it('should throw GroupNotFoundException when group not found', async () => {
      mockUserGroupRepository.findById.mockResolvedValue(null);

      await expect(service.findById(groupId, userId)).rejects.toThrow(
        GroupNotFoundException,
      );
    });

    it('should throw NotGroupMemberException when user is not a member', async () => {
      const mockGroup = { id: groupId, memberships: [], virtualMembers: [] };
      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(null);

      await expect(service.findById(groupId, userId)).rejects.toThrow(
        NotGroupMemberException,
      );
    });
  });

  describe('findAllByUserId', () => {
    const userId = TEST_IDS.USER;

    it('should return all groups for user', async () => {
      const mockGroups = [
        {
          id: `${TEST_IDS.USER_GROUP}-1`,
          memberships: [],
          virtualMembers: [],
        },
        {
          id: `${TEST_IDS.USER_GROUP}-2`,
          memberships: [],
          virtualMembers: [],
        },
      ];
      mockUserGroupRepository.findAllByUserId.mockResolvedValue(mockGroups);

      const result = await service.findAllByUserId(userId);

      expect(result).toHaveLength(2);
      expect(mockUserGroupRepository.findAllByUserId).toHaveBeenCalledWith(
        userId,
      );
    });
  });

  describe('update', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;
    const updateDto = UserGroupTestBuilder.createUpdateUserGroupDto();

    it('should update group when user is admin', async () => {
      const mockGroup = { id: groupId, memberships: [], virtualMembers: [] };
      const mockMembership = { userId, groupId, role: GroupRole.ADMIN };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );
      mockUserGroupRepository.update.mockResolvedValue({
        ...mockGroup,
        name: updateDto.name,
      });

      const result = await service.update(groupId, updateDto, userId);

      expect(result.name).toBe(updateDto.name);
    });

    it('should throw GroupAdminRequiredException when user is not admin', async () => {
      const mockGroup = { id: groupId, memberships: [], virtualMembers: [] };
      const mockMembership = { userId, groupId, role: GroupRole.MEMBER };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );

      await expect(service.update(groupId, updateDto, userId)).rejects.toThrow(
        GroupAdminRequiredException,
      );
    });
  });

  describe('joinByInviteCode', () => {
    const userId = TEST_IDS.USER;
    const inviteCode = TEST_DATA.INVITE_CODE;

    it('should join group successfully', async () => {
      const mockGroup = {
        id: TEST_IDS.USER_GROUP,
        inviteCode,
        memberships: [],
        virtualMembers: [],
      };
      mockUserGroupRepository.findByInviteCode.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(null);
      mockMembershipRepository.create.mockResolvedValue({});
      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);

      const result = await service.joinByInviteCode(inviteCode, userId);

      expect(result.id).toBe(TEST_IDS.USER_GROUP);
      expect(mockMembershipRepository.create).toHaveBeenCalledWith({
        userId,
        groupId: TEST_IDS.USER_GROUP,
        role: GroupRole.MEMBER,
      });
    });

    it('should throw InvalidInviteCodeException for invalid invite code', async () => {
      mockUserGroupRepository.findByInviteCode.mockResolvedValue(null);

      await expect(
        service.joinByInviteCode('invalid-code', userId),
      ).rejects.toThrow(InvalidInviteCodeException);
    });

    it('should throw GroupAlreadyMemberException when already a member', async () => {
      const mockGroup = { id: TEST_IDS.USER_GROUP, inviteCode };
      const mockMembership = { userId, groupId: TEST_IDS.USER_GROUP };

      mockUserGroupRepository.findByInviteCode.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );

      await expect(
        service.joinByInviteCode(inviteCode, userId),
      ).rejects.toThrow(GroupAlreadyMemberException);
    });
  });

  describe('leave', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;

    it('should allow member to leave', async () => {
      const mockMembership = { userId, groupId, role: GroupRole.MEMBER };
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );
      mockMembershipRepository.countMembers.mockResolvedValue(2);

      await service.leave(groupId, userId);

      expect(mockMembershipRepository.delete).toHaveBeenCalledWith(
        userId,
        groupId,
      );
    });

    it('should throw NotGroupMemberException when not a member', async () => {
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(null);

      await expect(service.leave(groupId, userId)).rejects.toThrow(
        NotGroupMemberException,
      );
    });

    it('should throw LastAdminCannotLeaveException when last admin tries to leave', async () => {
      const mockMembership = { userId, groupId, role: GroupRole.ADMIN };
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );
      mockMembershipRepository.countMembers.mockResolvedValue(2);
      mockMembershipRepository.countAdmins.mockResolvedValue(1);

      await expect(service.leave(groupId, userId)).rejects.toThrow(
        LastAdminCannotLeaveException,
      );
    });

    it('should allow admin to leave when there are other admins', async () => {
      const mockMembership = { userId, groupId, role: GroupRole.ADMIN };
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );
      mockMembershipRepository.countMembers.mockResolvedValue(2);
      mockMembershipRepository.countAdmins.mockResolvedValue(2);

      await service.leave(groupId, userId);

      expect(mockMembershipRepository.delete).toHaveBeenCalledWith(
        userId,
        groupId,
      );
    });

    it('should delete group when last member leaves', async () => {
      const mockMembership = { userId, groupId, role: GroupRole.ADMIN };
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );
      mockMembershipRepository.countMembers.mockResolvedValue(1);

      await service.leave(groupId, userId);

      expect(mockUserGroupRepository.delete).toHaveBeenCalledWith(groupId);
      expect(mockMembershipRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('addMember', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;
    const createDto = UserGroupTestBuilder.createCreateMemberDto();

    it('should add virtual member when user is a member', async () => {
      const mockGroup = { id: groupId };
      const mockMembership = { userId, groupId, role: GroupRole.MEMBER };
      const mockVirtualMember = {
        id: TEST_IDS.VIRTUAL_MEMBER,
        nickname: createDto.nickname,
        age: createDto.age,
        groupId,
        createdBy: userId,
        userId: null,
        role: GroupRole.MEMBER,
        joinedAt: new Date(),
      };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );
      mockMembershipRepository.createVirtualMember.mockResolvedValue(
        mockVirtualMember,
      );
      mockMembershipRepository.isVirtual.mockReturnValue(true); // userId is null

      const result = await service.addMember(groupId, createDto, userId);

      expect(result.id).toBe(TEST_IDS.VIRTUAL_MEMBER);
      expect(result.isVirtual).toBe(true);
      expect(mockMembershipRepository.createVirtualMember).toHaveBeenCalled();
    });

    it('should throw NotGroupMemberException when not a member', async () => {
      const mockGroup = { id: groupId };
      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(null);

      await expect(
        service.addMember(groupId, createDto, userId),
      ).rejects.toThrow(NotGroupMemberException);
    });
  });

  describe('updateMember', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;
    const memberId = TEST_IDS.VIRTUAL_MEMBER;
    const updateDto = { nickname: 'Updated Nickname' };

    it('should update virtual member when user is a member', async () => {
      const mockGroup = { id: groupId };
      const mockMembership = { userId, groupId, role: GroupRole.MEMBER };
      const mockVirtualMember = {
        id: memberId,
        nickname: 'Child',
        groupId,
        createdBy: userId,
        userId: null,
        role: GroupRole.MEMBER,
        joinedAt: new Date(),
      };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );
      mockMembershipRepository.findById.mockResolvedValue(mockVirtualMember);
      mockMembershipRepository.isVirtual.mockReturnValue(true);
      mockMembershipRepository.updateVirtualMember.mockResolvedValue({
        ...mockVirtualMember,
        nickname: updateDto.nickname,
      });

      const result = await service.updateMember(
        groupId,
        memberId,
        updateDto,
        userId,
      );

      expect(result.nickname).toBe(updateDto.nickname);
      expect(mockMembershipRepository.updateVirtualMember).toHaveBeenCalledWith(
        memberId,
        updateDto,
      );
    });

    it('should throw GroupMemberNotFoundException when member not found', async () => {
      const mockGroup = { id: groupId };
      const mockMembership = { userId, groupId, role: GroupRole.MEMBER };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );
      mockMembershipRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateMember(groupId, memberId, updateDto, userId),
      ).rejects.toThrow(GroupMemberNotFoundException);
    });

    it('should throw CannotUpdateRegisteredUserException when trying to update registered user', async () => {
      const mockGroup = { id: groupId };
      const mockMembership = { userId, groupId, role: GroupRole.MEMBER };
      const mockRegisteredMember = {
        id: memberId,
        groupId,
        userId: TEST_IDS.USER,
        role: GroupRole.MEMBER,
        joinedAt: new Date(),
      };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );
      mockMembershipRepository.findById.mockResolvedValue(mockRegisteredMember);
      mockMembershipRepository.isVirtual.mockReturnValue(false);

      await expect(
        service.updateMember(groupId, memberId, updateDto, userId),
      ).rejects.toThrow(CannotUpdateRegisteredUserException);
    });
  });

  describe('removeMember', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;
    const membershipId = TEST_IDS.GROUP_MEMBERSHIP;

    it('should remove virtual member when user is a member', async () => {
      const mockGroup = { id: groupId };
      const mockMembership = { userId, groupId, role: GroupRole.MEMBER };
      const mockVirtualMember = {
        id: membershipId,
        groupId,
        userId: null,
        role: GroupRole.MEMBER,
      };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findById.mockResolvedValue(mockVirtualMember);
      mockMembershipRepository.isVirtual.mockReturnValue(true);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );

      await service.removeMember(groupId, membershipId, userId);

      expect(mockMembershipRepository.deleteById).toHaveBeenCalledWith(
        membershipId,
      );
    });

    it('should throw BadRequestException when admin tries to remove themselves', async () => {
      const mockGroup = { id: groupId };
      const mockMembership = { userId, groupId, role: GroupRole.ADMIN };
      const mockRegisteredMember = {
        id: membershipId,
        groupId,
        userId,
        role: GroupRole.ADMIN,
      };

      mockMembershipRepository.findById.mockResolvedValue(mockRegisteredMember);
      mockMembershipRepository.isVirtual.mockReturnValue(false);
      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );

      await expect(
        service.removeMember(groupId, membershipId, userId),
      ).rejects.toThrow(UseSelfLeaveEndpointException);
    });
  });

  describe('transferAdmin', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;
    const targetMembershipId = 'target-membership-id';

    it('should promote member to admin', async () => {
      const mockGroup = { id: groupId };
      const mockAdminMembership = { userId, groupId, role: GroupRole.ADMIN };
      const mockTargetMembership = {
        id: targetMembershipId,
        groupId,
        userId: 'other-user-id',
        role: GroupRole.MEMBER,
        joinedAt: new Date(),
      };
      const updatedMembership = {
        ...mockTargetMembership,
        role: GroupRole.ADMIN,
      };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockAdminMembership,
      );
      mockMembershipRepository.findById.mockResolvedValue(mockTargetMembership);
      mockMembershipRepository.isVirtual.mockReturnValue(false);
      mockMembershipRepository.updateRoleById.mockResolvedValue(
        updatedMembership,
      );

      const result = await service.transferAdmin(
        groupId,
        targetMembershipId,
        userId,
      );

      expect(result.role).toBe(GroupRole.ADMIN);
      expect(mockMembershipRepository.updateRoleById).toHaveBeenCalledWith(
        targetMembershipId,
        GroupRole.ADMIN,
      );
    });

    it('should throw VirtualMemberCannotBeAdminException when target is virtual member', async () => {
      const mockGroup = { id: groupId };
      const mockAdminMembership = { userId, groupId, role: GroupRole.ADMIN };
      const mockVirtualMember = {
        id: targetMembershipId,
        groupId,
        userId: null,
        role: GroupRole.MEMBER,
      };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockAdminMembership,
      );
      mockMembershipRepository.findById.mockResolvedValue(mockVirtualMember);
      mockMembershipRepository.isVirtual.mockReturnValue(true);

      await expect(
        service.transferAdmin(groupId, targetMembershipId, userId),
      ).rejects.toThrow(VirtualMemberCannotBeAdminException);
    });

    it('should throw AlreadyAdminException when target is already admin', async () => {
      const mockGroup = { id: groupId };
      const mockAdminMembership = { userId, groupId, role: GroupRole.ADMIN };
      const mockExistingAdmin = {
        id: targetMembershipId,
        groupId,
        userId: 'other-user-id',
        role: GroupRole.ADMIN,
      };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockAdminMembership,
      );
      mockMembershipRepository.findById.mockResolvedValue(mockExistingAdmin);
      mockMembershipRepository.isVirtual.mockReturnValue(false);

      await expect(
        service.transferAdmin(groupId, targetMembershipId, userId),
      ).rejects.toThrow(AlreadyAdminException);
    });

    it('should throw GroupAdminRequiredException when user is not admin', async () => {
      const mockGroup = { id: groupId };
      const mockMembership = { userId, groupId, role: GroupRole.MEMBER };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );

      await expect(
        service.transferAdmin(groupId, targetMembershipId, userId),
      ).rejects.toThrow(GroupAdminRequiredException);
    });
  });
});
