import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { UserGroupsModule } from '../user-groups/user-groups.module';
import { LegalModule } from '../legal/legal.module';

@Module({
  imports: [UsersModule, UserGroupsModule, LegalModule],
})
export class UserCommunityModule {}
