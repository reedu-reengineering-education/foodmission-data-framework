import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConsentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.consentForm.findMany({
      where: { active: true },
      orderBy: { key: 'asc' },
    });
  }

  findByKey(key: string) {
    return this.prisma.consentForm.findUnique({
      where: { key },
    });
  }
}
