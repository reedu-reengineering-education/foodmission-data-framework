import { GroupRole } from '@prisma/client';
import { UserGroupResponseDto } from '../dto/response-user-group.dto';
import { MemberResponseDto } from '../dto/response-member.dto';
import { CreateUserGroupDto } from '../dto/create-user-group.dto';
import { UpdateUserGroupDto } from '../dto/update-user-group.dto';
import { CreateMemberDto } from '../dto/create-member.dto';
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

  /**
   * Creates a mock MemberResponseDto for a registered user.
   */
  static createRegisteredMemberResponseDto(
    overrides?: Partial<MemberResponseDto>,
  ): MemberResponseDto {
    return {
      id: TEST_IDS.GROUP_MEMBERSHIP,
      role: GroupRole.MEMBER,
      joinedAt: new Date(),
      isVirtual: false,
      userId: TEST_IDS.USER,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      ...overrides,
    };
  }

  /**
   * Creates a mock MemberResponseDto for a virtual member.
   */
  static createVirtualMemberResponseDto(
    overrides?: Partial<MemberResponseDto>,
  ): MemberResponseDto {
    return {
      id: TEST_IDS.VIRTUAL_MEMBER,
      role: GroupRole.MEMBER,
      joinedAt: new Date(),
      isVirtual: true,
      nickname: TEST_DATA.VIRTUAL_MEMBER_NICKNAME,
      age: 10,
      createdBy: TEST_IDS.USER,
      ...overrides,
    };
  }

  /**
   * Creates a CreateMemberDto for adding a virtual member.
   */
  static createCreateMemberDto(
    overrides?: Partial<CreateMemberDto>,
  ): CreateMemberDto {
    return {
      nickname: TEST_DATA.VIRTUAL_MEMBER_NICKNAME,
      age: 10,
      ...overrides,
    };
  }

  // Deprecated - use createRegisteredMemberResponseDto instead
  static createGroupMemberResponseDto =
    UserGroupTestBuilder.createRegisteredMemberResponseDto;
}
