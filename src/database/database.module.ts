import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { OffMongoPrismaService } from './off-mongo-prisma.service';

@Global()
@Module({
  providers: [PrismaService, OffMongoPrismaService],
  exports: [PrismaService, OffMongoPrismaService],
})
export class DatabaseModule {}
