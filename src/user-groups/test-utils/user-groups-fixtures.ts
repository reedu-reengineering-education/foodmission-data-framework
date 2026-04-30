import { GroupRole } from '@prisma/client';
import { TEST_IDS, TEST_DATA } from '../../common/test-utils/test-constants';

export function createMockGroup(overrides?: Record<string, any>) {
  return {
    id: TEST_IDS.USER_GROUP,
    name: TEST_DATA.GROUP_NAME,
    description: TEST_DATA.GROUP_DESCRIPTION,
    inviteCode: TEST_DATA.INVITE_CODE,
    createdBy: TEST_IDS.USER,
    createdAt: new Date(),
    memberships: [],
    virtualMembers: [],
    ...overrides,
  };
}

export function createMockMembership(
  userId: string,
  groupId: string,
  role: GroupRole = GroupRole.MEMBER,
  overrides?: Record<string, any>,
) {
  return {
    id: TEST_IDS.GROUP_MEMBERSHIP,
    userId,
    groupId,
    role,
    joinedAt: new Date(),
    ...overrides,
  };
}

export function createMockAdminMembership(userId: string, groupId: string) {
  return createMockMembership(userId, groupId, GroupRole.ADMIN);
}

export function createMockVirtualMember(
  groupId: string,
  createdBy: string,
  overrides?: Record<string, any>,
) {
  return {
    id: TEST_IDS.VIRTUAL_MEMBER,
    nickname: TEST_DATA.VIRTUAL_MEMBER_NICKNAME,
    groupId,
    createdBy,
    userId: null,
    role: GroupRole.MEMBER,
    joinedAt: new Date(),
    age: 10,
    ...overrides,
  };
}

export function createMockRegisteredMember(
  groupId: string,
  userId: string,
  overrides?: Record<string, any>,
) {
  return {
    id: TEST_IDS.GROUP_MEMBERSHIP,
    groupId,
    userId,
    role: GroupRole.MEMBER,
    joinedAt: new Date(),
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    ...overrides,
  };
}

export function setupUserAsMember(
  groupRepo: { findById: jest.Mock },
  membershipRepo: { findByUserAndGroup: jest.Mock },
  userId: string,
  groupId: string,
) {
  const group = createMockGroup({ id: groupId });
  const membership = createMockMembership(userId, groupId);

  groupRepo.findById.mockResolvedValue(group);
  membershipRepo.findByUserAndGroup.mockResolvedValue(membership);

  return { group, membership };
}

export function setupUserAsAdmin(
  groupRepo: { findById: jest.Mock },
  membershipRepo: { findByUserAndGroup: jest.Mock },
  userId: string,
  groupId: string,
) {
  const group = createMockGroup({ id: groupId });
  const membership = createMockAdminMembership(userId, groupId);

  groupRepo.findById.mockResolvedValue(group);
  membershipRepo.findByUserAndGroup.mockResolvedValue(membership);

  return { group, membership };
}

export function setupUserNotMember(
  groupRepo: { findById: jest.Mock },
  membershipRepo: { findByUserAndGroup: jest.Mock },
  groupId: string,
) {
  const group = createMockGroup({ id: groupId });

  groupRepo.findById.mockResolvedValue(group);
  membershipRepo.findByUserAndGroup.mockResolvedValue(null);

  return { group };
}

export function setupGroupNotFound(groupRepo: { findById: jest.Mock }) {
  groupRepo.findById.mockResolvedValue(null);
}
