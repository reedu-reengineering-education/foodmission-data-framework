import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { UserGroupModule } from '../userGroup/userGroup.module';

@Module({
  imports: [UserModule, UserGroupModule],
})
export class UserCommunityModule {}
