import { UserGroupService as UserGroupsService } from '../services/user-groups.service';

export const createMockUserGroupsService = (): jest.Mocked<
  Pick<
    UserGroupsService,
    | 'create'
    | 'findById'
    | 'findAllByUserId'
    | 'update'
    | 'remove'
    | 'joinByInviteCode'
    | 'leave'
    | 'regenerateInviteCode'
    | 'getInviteCode'
    | 'getMembers'
    | 'addMember'
    | 'updateMember'
    | 'removeMember'
    | 'transferAdmin'
  >
> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAllByUserId: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  joinByInviteCode: jest.fn(),
  leave: jest.fn(),
  regenerateInviteCode: jest.fn(),
  getInviteCode: jest.fn(),
  getMembers: jest.fn(),
  addMember: jest.fn(),
  updateMember: jest.fn(),
  removeMember: jest.fn(),
  transferAdmin: jest.fn(),
});
