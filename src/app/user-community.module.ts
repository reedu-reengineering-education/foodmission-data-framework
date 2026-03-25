import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { UserGroupsModule } from '../user-groups/user-groups.module';

@Module({
  imports: [UsersModule, UserGroupsModule],
})
export class UserCommunityModule {}
