import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error: any) {
      this.logger.error('Failed to connect to database', error);
      this.logger.error(
        'Please check your DATABASE_URL environment variable and ensure the database is running.',
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  enableShutdownHooks(app: any) {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
