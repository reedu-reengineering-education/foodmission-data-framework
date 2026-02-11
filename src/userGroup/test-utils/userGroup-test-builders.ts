import { GroupRole } from '@prisma/client';
import { UserGroupResponseDto } from '../dto/response-userGroup.dto';
import { GroupMemberResponseDto } from '../dto/response-groupMember.dto';
import { VirtualMemberResponseDto } from '../dto/response-virtualMember.dto';
import { CreateUserGroupDto } from '../dto/create-userGroup.dto';
import { UpdateUserGroupDto } from '../dto/update-userGroup.dto';
import { CreateVirtualMemberDto } from '../dto/create-virtualMember.dto';
import { TEST_IDS, TEST_DATA } from '../../common/test-utils/test-constants';

export class UserGroupTestBuilder {
  static createUserGroupResponseDto(
    overrides?: Partial<UserGroupResponseDto>,
  ): UserGroupResponseDto {
    return {
      id: TEST_IDS.USER_GROUP,
      name: TEST_DATA.GROUP_NAME,
      description: TEST_DATA.GROUP_DESCRIPTION,
      inviteCode: TEST_DATA.INVITE_CODE,
      createdBy: TEST_IDS.USER,
      createdAt: new Date(),
      members: [],
      virtualMembers: [],
      ...overrides,
    };
  }

  static createUserGroupResponseDtoArray(
    count: number = 2,
  ): UserGroupResponseDto[] {
    return Array.from({ length: count }, (_, index) =>
      this.createUserGroupResponseDto({
        id: `${TEST_IDS.USER_GROUP}-${index + 1}`,
        name: `${TEST_DATA.GROUP_NAME} ${index + 1}`,
      }),
    );
  }

  static createCreateUserGroupDto(
    overrides?: Partial<CreateUserGroupDto>,
  ): CreateUserGroupDto {
    return {
      name: TEST_DATA.GROUP_NAME,
      description: TEST_DATA.GROUP_DESCRIPTION,
      ...overrides,
    };
  }

  static createUpdateUserGroupDto(
    overrides?: Partial<UpdateUserGroupDto>,
  ): UpdateUserGroupDto {
    return {
      name: 'Updated Group Name',
      description: 'Updated description',
      ...overrides,
    };
  }

  static createGroupMemberResponseDto(
    overrides?: Partial<GroupMemberResponseDto>,
  ): GroupMemberResponseDto {
    return {
      id: TEST_IDS.GROUP_MEMBERSHIP,
      userId: TEST_IDS.USER,
      role: GroupRole.MEMBER,
      joinedAt: new Date(),
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      ...overrides,
    };
  }

  static createVirtualMemberResponseDto(
    overrides?: Partial<VirtualMemberResponseDto>,
  ): VirtualMemberResponseDto {
    return {
      id: TEST_IDS.VIRTUAL_MEMBER,
      nickname: TEST_DATA.VIRTUAL_MEMBER_NICKNAME,
      age: 10,
      createdAt: new Date(),
      createdBy: TEST_IDS.USER,
      ...overrides,
    };
  }

  static createCreateVirtualMemberDto(
    overrides?: Partial<CreateVirtualMemberDto>,
  ): CreateVirtualMemberDto {
    return {
      nickname: TEST_DATA.VIRTUAL_MEMBER_NICKNAME,
      age: 10,
      ...overrides,
    };
  }
}
