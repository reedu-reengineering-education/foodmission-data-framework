import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        pantry: {
          create: {},
        },
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findById(id: string) {
    return this.findOne(id);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByKeycloakId(keycloakId: string) {
    return this.prisma.user.findUnique({
      where: { keycloakId },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  /** Update lastLoginAt only if null or older than intervalMs (multi-instance safe). */
  async touchLastLoginAt(
    id: string,
    at: Date = new Date(),
    intervalMs = 5 * 60 * 1000,
  ) {
    const threshold = new Date(at.getTime() - intervalMs);
    return this.prisma.user.updateMany({
      where: {
        id,
        OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: threshold } }],
      },
      data: { lastLoginAt: at },
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async delete(id: string) {
    return this.remove(id);
  }
}
