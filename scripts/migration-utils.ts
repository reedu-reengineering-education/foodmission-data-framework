#!/usr/bin/env ts-node

/**
 * Database Migration Utilities
 *
 * This module provides utilities for handling database schema changes,
 * data migrations, and version management beyond Prisma's built-in
 * migration system.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MigrationScript {
  version: string;
  name: string;
  description: string;
  up: (prisma: PrismaClient) => Promise<void>;
  down: (prisma: PrismaClient) => Promise<void>;
}

export class MigrationManager {
  private migrations: MigrationScript[] = [];

  constructor() {
    this.loadMigrations();
  }

  private loadMigrations() {
    // Example migration scripts - these would be loaded from files in a real implementation
    this.migrations = [
      // {
      //   version: '001',
      //   name: 'add_sample_data',
      //   description: 'Add sample data for development',
      //   up: function (): Promise<void> {

      //   },
      //   down: function (): Promise<void> {

      //   },
      // },
      {
        version: '002',
        name: 'update_food_descriptions',
        description: 'Update food descriptions with enhanced content',
        up: async (prisma: PrismaClient) => {
          console.log('Running migration: update_food_descriptions (up)');
          await this.enhanceFoodDescriptions(prisma);
        },
        down: async (prisma: PrismaClient) => {
          console.log(
            'Rolling back migration: update_food_descriptions (down)',
          );
          await this.revertFoodDescriptions(prisma);
        },
      },
    ];
  }

  async runMigration(version: string) {
    const migration = this.migrations.find((m) => m.version === version);
    if (!migration) {
      throw new Error(`Migration ${version} not found`);
    }

    console.log(`🔄 Running migration ${version}: ${migration.name}`);
    console.log(`📝 ${migration.description}`);

    try {
      await migration.up(prisma);
      this.recordMigration(migration);
      console.log(`✅ Migration ${version} completed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${version} failed:`, error);
      throw error;
    }
  }

  async rollbackMigration(version: string) {
    const migration = this.migrations.find((m) => m.version === version);
    if (!migration) {
      throw new Error(`Migration ${version} not found`);
    }

    console.log(`⏪ Rolling back migration ${version}: ${migration.name}`);

    try {
      await migration.down(prisma);
      this.removeMigrationRecord(version);
      console.log(`✅ Migration ${version} rolled back successfully`);
    } catch (error) {
      console.error(`❌ Rollback ${version} failed:`, error);
      throw error;
    }
  }

  listMigrations() {
    console.log('📋 Available migrations:');
    this.migrations.forEach((migration) => {
      console.log(
        `  ${migration.version}: ${migration.name} - ${migration.description}`,
      );
    });
  }

  private recordMigration(migration: MigrationScript) {
    // In a real implementation, this would record the migration in a tracking table
    console.log(`📝 Recording migration ${migration.version} as completed`);
  }

  private removeMigrationRecord(version: string) {
    // In a real implementation, this would remove the migration record
    console.log(`🗑️  Removing migration record for ${version}`);
  }

  private async enhanceFoodDescriptions(prisma: PrismaClient) {
    const foodProducts = await prisma.foodProduct.findMany();

    for (const foodProduct of foodProducts) {
      if (foodProduct.description && !foodProduct.description.includes('Enhanced:')) {
        await prisma.foodProduct.update({
          where: { id: foodProduct.id },
          data: {
            description: `Enhanced: ${foodProduct.description}`,
          },
        });
      }
    }
  }

  private async revertFoodDescriptions(prisma: PrismaClient) {
    const foodProducts = await prisma.foodProduct.findMany({
      where: {
        description: {
          contains: 'Enhanced:',
        },
      },
    });

    for (const foodProduct of foodProducts) {
      if (foodProduct.description) {
        await prisma.foodProduct.update({
          where: { id: foodProduct.id },
          data: {
            description: foodProduct.description.replace('Enhanced: ', ''),
          },
        });
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const version = args[1];

  const migrationManager = new MigrationManager();

  try {
    switch (command) {
      case 'list':
        migrationManager.listMigrations();
        break;
      case 'run':
        if (!version) {
          console.error('❌ Version required for run command');
          process.exit(1);
        }
        await migrationManager.runMigration(version);
        break;
      case 'rollback':
        if (!version) {
          console.error('❌ Version required for rollback command');
          process.exit(1);
        }
        await migrationManager.rollbackMigration(version);
        break;
      default:
        console.log('📖 Usage:');
        console.log(
          '  npm run migrate list                 # List available migrations',
        );
        console.log(
          '  npm run migrate run <version>        # Run a specific migration',
        );
        console.log(
          '  npm run migrate rollback <version>   # Rollback a specific migration',
        );
        break;
    }
  } catch (error) {
    console.error('❌ Migration command failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Error:', e);
      process.exit(1);
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
