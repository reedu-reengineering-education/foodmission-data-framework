import { Module } from '@nestjs/common';
import { StaticValuesController } from './controllers/static-values.controller';
import { StaticValuesService } from './services/static-values.service';

@Module({
  controllers: [StaticValuesController],
  providers: [StaticValuesService],
})
export class StaticValuesModule {}
