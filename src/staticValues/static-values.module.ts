import { Module } from '@nestjs/common';
import { StaticValuesController } from './controllers/static-values.controller';
import { StaticValuesService } from './services/static-values.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [StaticValuesController],
  providers: [StaticValuesService],
})
export class StaticValuesModule {}
