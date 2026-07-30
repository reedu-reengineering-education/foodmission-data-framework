import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateConsentFormDto,
  UpdateConsentFormDto,
} from '../dto/consent.dto';

@Injectable()
export class ConsentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.consentForm.findMany({
      where: { active: true },
      orderBy: { key: 'asc' },
    });
  }

  findAll() {
    return this.prisma.consentForm.findMany({
      orderBy: { key: 'asc' },
    });
  }

  findByKey(key: string) {
    return this.prisma.consentForm.findUnique({
      where: { key },
    });
  }

  createForm(data: CreateConsentFormDto) {
    return this.prisma.consentForm.create({
      data: {
        key: data.key,
        name: data.name,
        title: data.title,
        body: data.body,
        required: data.required ?? true,
      },
    });
  }

  updateForm(id: string, data: UpdateConsentFormDto) {
    return this.prisma.consentForm.update({
      where: { id },
      data,
    });
  }

  findUserSettings(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, settings: true },
    });
  }

  updateUserSettings(userId: string, settings: Record<string, unknown>) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { settings: settings as Prisma.InputJsonValue },
      select: { id: true, settings: true },
    });
  }
}
