import { Module } from '@nestjs/common';
import { UsersModule } from '../user/users.module';
import { UserGroupModule } from '../userGroup/userGroup.module';

@Module({
  imports: [UsersModule, UserGroupModule],
})
export class UserCommunityModule {}
