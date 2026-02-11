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
    | 'removeMember'
    | 'transferAdmin'
    | 'addVirtualMember'
    | 'updateVirtualMember'
    | 'removeVirtualMember'
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
  removeMember: jest.fn(),
  transferAdmin: jest.fn(),
  addVirtualMember: jest.fn(),
  updateVirtualMember: jest.fn(),
  removeVirtualMember: jest.fn(),
});
