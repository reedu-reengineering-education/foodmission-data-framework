import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { UserGroupModule } from '../userGroup/userGroup.module';

/**
 * Users and group membership.
 */
@Module({
  imports: [UserModule, UserGroupModule],
})
export class UserCommunityModule {}
