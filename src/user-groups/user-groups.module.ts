import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UsersModule } from '../users/users.module';
import { UserGroupController } from './controllers/user-groups.controller';
import { UserGroupService } from './services/user-groups.service';
import { UserGroupRepository } from './repositories/user-groups.repository';
import { GroupMembershipRepository } from './repositories/group-memberships.repository';

@Module({
  imports: [DatabaseModule, CommonModule, UsersModule],
  controllers: [UserGroupController],
  providers: [UserGroupService, UserGroupRepository, GroupMembershipRepository],
  exports: [UserGroupService, UserGroupRepository],
})
export class UserGroupsModule {}
