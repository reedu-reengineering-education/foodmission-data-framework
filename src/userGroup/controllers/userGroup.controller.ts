import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { UserGroupService } from '../services/userGroup.service';
import {
  CreateUserGroupDto,
  UpdateUserGroupDto,
  UserGroupResponseDto,
  JoinGroupDto,
  CreateVirtualMemberDto,
  UpdateVirtualMemberDto,
  VirtualMemberResponseDto,
  GroupMemberResponseDto,
} from '../dto';

@ApiTags('groups')
@Controller('groups')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class UserGroupController {
  constructor(private readonly userGroupService: UserGroupService) {}

  // ========== Group CRUD ==========

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create a new group',
    description:
      'Creates a new group and adds the creator as an admin. Returns the group with its unique invite code.',
  })
  @ApiBody({ type: CreateUserGroupDto })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    type: UserGroupResponseDto,
  })
  @ApiCrudErrorResponses()
  async create(
    @Body() createDto: CreateUserGroupDto,
    @CurrentUser('id') userId: string,
  ): Promise<UserGroupResponseDto> {
    return this.userGroupService.create(createDto, userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all groups for current user',
    description: 'Returns all groups where the authenticated user is a member.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of groups',
    type: [UserGroupResponseDto],
  })
  @ApiCrudErrorResponses()
  async findAll(
    @CurrentUser('id') userId: string,
  ): Promise<UserGroupResponseDto[]> {
    return this.userGroupService.findAllByUserId(userId);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get group by ID',
    description: 'Returns a specific group if the user is a member.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Group found',
    type: UserGroupResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not a member of this group' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiCrudErrorResponses()
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<UserGroupResponseDto> {
    return this.userGroupService.findById(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update group',
    description: 'Updates group name/description. Admin only.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateUserGroupDto })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
    type: UserGroupResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Admin privileges required' })
  @ApiCrudErrorResponses()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUserGroupDto,
    @CurrentUser('id') userId: string,
  ): Promise<UserGroupResponseDto> {
    return this.userGroupService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete group',
    description:
      'Deletes a group and all its memberships/virtual members. Admin only.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Group deleted successfully' })
  @ApiResponse({ status: 403, description: 'Admin privileges required' })
  @ApiCrudErrorResponses()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.userGroupService.remove(id, userId);
  }

  // ========== Invite & Join ==========

  @Post('join')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Join a group by invite code',
    description: 'Joins an existing group using the invite code.',
  })
  @ApiBody({ type: JoinGroupDto })
  @ApiResponse({
    status: 201,
    description: 'Successfully joined the group',
    type: UserGroupResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Invalid invite code' })
  @ApiResponse({
    status: 409,
    description: 'Already a member of this group',
  })
  @ApiCrudErrorResponses()
  async join(
    @Body() joinDto: JoinGroupDto,
    @CurrentUser('id') userId: string,
  ): Promise<UserGroupResponseDto> {
    return this.userGroupService.joinByInviteCode(joinDto.inviteCode, userId);
  }

  @Post(':id/leave')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Leave a group',
    description:
      'Leaves a group. Last admin cannot leave without transferring rights.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Left the group successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot leave: you are the last admin',
  })
  @ApiCrudErrorResponses()
  async leave(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.userGroupService.leave(id, userId);
  }

  @Get(':id/invite-code')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get invite code',
    description: 'Returns the current invite code for the group. Admin only.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Invite code returned',
    schema: { properties: { inviteCode: { type: 'string' } } },
  })
  @ApiResponse({ status: 403, description: 'Admin privileges required' })
  @ApiCrudErrorResponses()
  async getInviteCode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ inviteCode: string }> {
    return this.userGroupService.getInviteCode(id, userId);
  }

  @Post(':id/regenerate-code')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Regenerate invite code',
    description:
      'Generates a new invite code, invalidating the old one. Admin only.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'New invite code generated',
    schema: { properties: { inviteCode: { type: 'string' } } },
  })
  @ApiResponse({ status: 403, description: 'Admin privileges required' })
  @ApiCrudErrorResponses()
  async regenerateInviteCode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ inviteCode: string }> {
    return this.userGroupService.regenerateInviteCode(id, userId);
  }

  // ========== Member Management ==========

  @Get(':id/members')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all members',
    description:
      'Returns all registered members and virtual members of the group.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Members list',
    schema: {
      properties: {
        members: { type: 'array', items: { $ref: '#/components/schemas/GroupMemberResponseDto' } },
        virtualMembers: { type: 'array', items: { $ref: '#/components/schemas/VirtualMemberResponseDto' } },
      },
    },
  })
  @ApiCrudErrorResponses()
  async getMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ members: GroupMemberResponseDto[]; virtualMembers: VirtualMemberResponseDto[] }> {
    return this.userGroupService.getMembers(id, userId);
  }

  @Delete(':id/members/:memberId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove a member',
    description: 'Removes a registered member from the group. Admin only.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Group ID' })
  @ApiParam({ name: 'memberId', type: 'string', format: 'uuid', description: 'Membership ID' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Admin privileges required' })
  @ApiCrudErrorResponses()
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.userGroupService.removeMember(id, memberId, userId);
  }

  @Post(':id/members/:memberId/make-admin')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Promote member to admin',
    description:
      'Promotes a regular member to admin role. Existing admin only. Use this before leaving if you are the last admin.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Group ID' })
  @ApiParam({ name: 'memberId', type: 'string', format: 'uuid', description: 'Membership ID to promote' })
  @ApiResponse({
    status: 200,
    description: 'Member promoted to admin',
    type: GroupMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Target is already an admin' })
  @ApiResponse({ status: 403, description: 'Admin privileges required' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiCrudErrorResponses()
  async transferAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') userId: string,
  ): Promise<GroupMemberResponseDto> {
    return this.userGroupService.transferAdmin(id, memberId, userId);
  }

  // ========== Virtual Members ==========

  @Post(':id/virtual-members')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Add a virtual member',
    description:
      'Adds a member without an account (e.g., child or dependent). Any group member can add virtual members.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: CreateVirtualMemberDto })
  @ApiResponse({
    status: 201,
    description: 'Virtual member added',
    type: VirtualMemberResponseDto,
  })
  @ApiCrudErrorResponses()
  async addVirtualMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createDto: CreateVirtualMemberDto,
    @CurrentUser('id') userId: string,
  ): Promise<VirtualMemberResponseDto> {
    return this.userGroupService.addVirtualMember(id, createDto, userId);
  }

  @Patch(':id/virtual-members/:vmId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a virtual member',
    description: 'Updates virtual member information. Any group member can update.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Group ID' })
  @ApiParam({ name: 'vmId', type: 'string', format: 'uuid', description: 'Virtual member ID' })
  @ApiBody({ type: UpdateVirtualMemberDto })
  @ApiResponse({
    status: 200,
    description: 'Virtual member updated',
    type: VirtualMemberResponseDto,
  })
  @ApiCrudErrorResponses()
  async updateVirtualMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vmId', ParseUUIDPipe) vmId: string,
    @Body() updateDto: UpdateVirtualMemberDto,
    @CurrentUser('id') userId: string,
  ): Promise<VirtualMemberResponseDto> {
    return this.userGroupService.updateVirtualMember(id, vmId, updateDto, userId);
  }

  @Delete(':id/virtual-members/:vmId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove a virtual member',
    description: 'Removes a virtual member from the group. Any group member can remove.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Group ID' })
  @ApiParam({ name: 'vmId', type: 'string', format: 'uuid', description: 'Virtual member ID' })
  @ApiResponse({ status: 200, description: 'Virtual member removed' })
  @ApiCrudErrorResponses()
  async removeVirtualMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vmId', ParseUUIDPipe) vmId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.userGroupService.removeVirtualMember(id, vmId, userId);
  }
}
