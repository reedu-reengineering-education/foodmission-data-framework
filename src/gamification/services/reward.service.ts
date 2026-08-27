import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Reward } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface CreateRewardInput {
  name: string;
  points?: number | null;
  xp?: number | null;
  badgeId?: string | null;
  avatarItem?: string | null;
  petItem?: string | null;
  collectible?: string | null;
  collectibleShareable?: boolean;
}

export interface UpdateRewardInput {
  name?: string;
  points?: number | null;
  xp?: number | null;
  badgeId?: string | null;
  avatarItem?: string | null;
  petItem?: string | null;
  collectible?: string | null;
  collectibleShareable?: boolean;
}

@Injectable()
export class RewardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new reward.
   * At least one of points or xp must be provided.
   */
  async create(input: CreateRewardInput): Promise<Reward> {
    if (!input.points && !input.xp) {
      throw new BadRequestException(
        'Reward must have either points or xp (or both)',
      );
    }

    try {
      return await this.prisma.reward.create({
        data: {
          name: input.name,
          points: input.points ?? null,
          xp: input.xp ?? null,
          badgeId: input.badgeId ?? null,
          avatarItem: input.avatarItem ?? null,
          petItem: input.petItem ?? null,
          collectible: input.collectible ?? null,
          collectibleShareable: input.collectibleShareable ?? false,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Reward with name "${input.name}" already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Get a reward by ID.
   */
  async getById(id: string): Promise<Reward> {
    const reward = await this.prisma.reward.findUnique({
      where: { id },
    });

    if (!reward) {
      throw new NotFoundException(`Reward with ID "${id}" not found`);
    }

    return reward;
  }

  /**
   * Get a reward by name.
   */
  async getByName(name: string): Promise<Reward> {
    const reward = await this.prisma.reward.findUnique({
      where: { name },
    });

    if (!reward) {
      throw new NotFoundException(`Reward with name "${name}" not found`);
    }

    return reward;
  }

  /**
   * List all rewards with optional filtering.
   */
  async list(
    filter?: {
      skip?: number;
      take?: number;
    },
  ): Promise<Reward[]> {
    return this.prisma.reward.findMany({
      skip: filter?.skip,
      take: filter?.take,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update a reward.
   */
  async update(id: string, input: UpdateRewardInput): Promise<Reward> {
    // Ensure reward exists first
    await this.getById(id);

    // Validate that at least one currency is present after update
    if (
      input.points !== undefined &&
      input.xp !== undefined &&
      !input.points &&
      !input.xp
    ) {
      throw new BadRequestException(
        'Reward must have either points or xp (or both)',
      );
    }

    try {
      return await this.prisma.reward.update({
        where: { id },
        data: {
          name: input.name,
          points: input.points ?? undefined,
          xp: input.xp ?? undefined,
          badgeId: input.badgeId ?? undefined,
          avatarItem: input.avatarItem ?? undefined,
          petItem: input.petItem ?? undefined,
          collectible: input.collectible ?? undefined,
          collectibleShareable: input.collectibleShareable ?? undefined,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Reward with name "${input.name}" already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Delete a reward.
   */
  async delete(id: string): Promise<void> {
    const reward = await this.getById(id);

    try {
      await this.prisma.reward.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          `Cannot delete reward "${reward.name}": it is in use by missions, challenges, quests, or quizzes`,
        );
      }
      throw error;
    }
  }

  /**
   * Count total rewards.
   */
  async count(): Promise<number> {
    return this.prisma.reward.count();
  }
}
