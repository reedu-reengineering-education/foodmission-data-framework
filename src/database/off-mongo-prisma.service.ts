import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '.prisma/off-mongo-client';

@Injectable()
export class OffMongoPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(OffMongoPrismaService.name);
  readonly isConfigured: boolean;

  constructor(configService: ConfigService) {
    const url = configService.get<string>('MONGODB_OFF_URL');
    super(url ? { datasourceUrl: url } : undefined);
    this.isConfigured = !!url;
  }

  async onModuleInit() {
    if (!this.isConfigured) {
      this.logger.warn(
        'MONGODB_OFF_URL not set — OpenFoodFacts Mongo lookups disabled, using HTTP API only',
      );
      return;
    }

    try {
      await this.$connect();
    } catch (error) {
      this.logger.error(
        'Failed to connect to the OpenFoodFacts MongoDB clone at startup; will fall back to the HTTP API per request',
        error as Error,
      );
    }
  }

  async onModuleDestroy() {
    if (this.isConfigured) {
      await this.$disconnect();
    }
  }
}
