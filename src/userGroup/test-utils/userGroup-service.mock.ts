import { UserGroupService } from '../services/userGroup.service';

export const createMockUserGroupService = (): jest.Mocked<
  Pick<
    UserGroupService,
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
