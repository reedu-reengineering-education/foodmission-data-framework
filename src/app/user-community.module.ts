import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { UserGroupModule } from '../userGroup/groups.module';

@Module({
  imports: [UsersModule, UserGroupModule],
})
export class UserCommunityModule {}
