import { Test, TestingModule } from '@nestjs/testing';
import { UserGroupService } from './userGroup.service';
import { UserGroupRepository } from '../repositories/userGroup.repository';
import { GroupMembershipRepository } from '../repositories/groupMembership.repository';
import { VirtualMemberRepository } from '../repositories/virtualMember.repository';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { GroupRole } from '@prisma/client';
import { UserGroupTestBuilder } from '../test-utils/userGroup-test-builders';
import { TEST_IDS, TEST_DATA } from '../../common/test-utils/test-constants';

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
  };

  const mockVirtualMemberRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByGroupId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
        {
          provide: VirtualMemberRepository,
          useValue: mockVirtualMemberRepository,
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
        virtualMembers: [],
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

    it('should throw NotFoundException when group not found', async () => {
      mockUserGroupRepository.findById.mockResolvedValue(null);

      await expect(service.findById(groupId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      const mockGroup = { id: groupId, memberships: [], virtualMembers: [] };
      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(null);

      await expect(service.findById(groupId, userId)).rejects.toThrow(
        ForbiddenException,
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

    it('should throw ForbiddenException when user is not admin', async () => {
      const mockGroup = { id: groupId, memberships: [], virtualMembers: [] };
      const mockMembership = { userId, groupId, role: GroupRole.MEMBER };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );

      await expect(
        service.update(groupId, updateDto, userId),
      ).rejects.toThrow(ForbiddenException);
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

    it('should throw NotFoundException for invalid invite code', async () => {
      mockUserGroupRepository.findByInviteCode.mockResolvedValue(null);

      await expect(
        service.joinByInviteCode('invalid-code', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when already a member', async () => {
      const mockGroup = { id: TEST_IDS.USER_GROUP, inviteCode };
      const mockMembership = { userId, groupId: TEST_IDS.USER_GROUP };

      mockUserGroupRepository.findByInviteCode.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );

      await expect(
        service.joinByInviteCode(inviteCode, userId),
      ).rejects.toThrow(ConflictException);
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

    it('should throw NotFoundException when not a member', async () => {
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(null);

      await expect(service.leave(groupId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when last admin tries to leave', async () => {
      const mockMembership = { userId, groupId, role: GroupRole.ADMIN };
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );
      mockMembershipRepository.countMembers.mockResolvedValue(2);
      mockMembershipRepository.countAdmins.mockResolvedValue(1);

      await expect(service.leave(groupId, userId)).rejects.toThrow(
        BadRequestException,
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

  describe('addVirtualMember', () => {
    const userId = TEST_IDS.USER;
    const groupId = TEST_IDS.USER_GROUP;
    const createDto = UserGroupTestBuilder.createCreateVirtualMemberDto();

    it('should add virtual member when user is a member', async () => {
      const mockGroup = { id: groupId };
      const mockMembership = { userId, groupId, role: GroupRole.MEMBER };
      const mockVirtualMember = {
        id: TEST_IDS.VIRTUAL_MEMBER,
        ...createDto,
        groupId,
        createdBy: userId,
      };

      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(
        mockMembership,
      );
      mockVirtualMemberRepository.create.mockResolvedValue(mockVirtualMember);

      const result = await service.addVirtualMember(groupId, createDto, userId);

      expect(result.id).toBe(TEST_IDS.VIRTUAL_MEMBER);
      expect(mockVirtualMemberRepository.create).toHaveBeenCalledWith(
        groupId,
        userId,
        createDto,
      );
    });

    it('should throw ForbiddenException when not a member', async () => {
      const mockGroup = { id: groupId };
      mockUserGroupRepository.findById.mockResolvedValue(mockGroup);
      mockMembershipRepository.findByUserAndGroup.mockResolvedValue(null);

      await expect(
        service.addVirtualMember(groupId, createDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
