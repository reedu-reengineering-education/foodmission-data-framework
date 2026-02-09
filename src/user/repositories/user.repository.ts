import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // Cast DTO to any to avoid tight coupling between DTO shapes and Prisma generated types
    // (Prisma client types can be regenerated and are sometimes stricter than DTOs).
    return this.prisma.user.create({
      data: createUserDto as any,
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
      data: updateUserDto as any,
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
