import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UserModule } from '../user/user.module';
import { UserGroupController } from './controllers/userGroup.controller';
import { UserGroupService } from './services/userGroup.service';
import { UserGroupRepository } from './repositories/userGroup.repository';
import { GroupMembershipRepository } from './repositories/groupMembership.repository';
import { VirtualMemberRepository } from './repositories/virtualMember.repository';

@Module({
  imports: [DatabaseModule, CommonModule, UserModule],
  controllers: [UserGroupController],
  providers: [
    UserGroupService,
    UserGroupRepository,
    GroupMembershipRepository,
    VirtualMemberRepository,
  ],
  exports: [UserGroupService, UserGroupRepository],
})
export class UserGroupModule {}
