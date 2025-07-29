/**
 * User E2E Tests
 * Tests complete user workflows with authentication
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../src/auth/guards/roles.guard';

describe('User E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: any;

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.userPreferences.deleteMany({
      where: {
        user: {
          email: {
            contains: 'e2e-test',
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'e2e-test',
        },
      },
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        keycloakId: 'e2e-test-user-1',
        email: 'e2e-test-user@example.com',
        firstName: 'E2E',
        lastName: 'TestUser',
      },
    });

    // Mock authentication context
    mockAuthGuard.canActivate.mockImplementation((context) => {
      const request = context.switchToHttp().getRequest();
      request.user = {
        sub: testUser.keycloakId,
        email: testUser.email,
        preferred_username: 'e2etestuser',
        given_name: testUser.firstName,
        family_name: testUser.lastName,
        roles: ['user'],
      };
      return true;
    });
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.userPreferences.deleteMany({
      where: {
        user: {
          email: {
            contains: 'e2e-test',
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'e2e-test',
        },
      },
    });
    await app.close();
  });

  describe('Authentication Tests', () => {
    it('should return 401 when no token provided', () => {
      mockAuthGuard.canActivate.mockReturnValueOnce(false);

      return request(app.getHttpServer()).get('/users/profile').expect(401);
    });

    it('should return 401 when invalid token provided', () => {
      mockAuthGuard.canActivate.mockReturnValueOnce(false);

      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/users/profile (GET)', () => {
    it('should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .expect(200);

      expect(response.body).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        keycloakId: testUser.keycloakId,
      });
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should get user profile with preferences', async () => {
      // Create preferences for test user
      await prisma.userPreferences.create({
        data: {
          userId: testUser.id,
          dietaryRestrictions: ['vegetarian'],
          allergies: ['nuts'],
          preferredCategories: ['Fruits'],
        },
      });

      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .expect(200);

      expect(response.body.preferences).toBeDefined();
      expect(response.body.preferences.dietaryRestrictions).toEqual([
        'vegetarian',
      ]);
      expect(response.body.preferences.allergies).toEqual(['nuts']);
      expect(response.body.preferences.preferredCategories).toEqual(['Fruits']);
    });
  });

  describe('/users/profile (PATCH)', () => {
    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe(updateData.firstName);
      expect(response.body.lastName).toBe(updateData.lastName);
      expect(response.body.email).toBe(testUser.email); // Should remain unchanged

      // Verify in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(updatedUser!.firstName).toBe(updateData.firstName);
      expect(updatedUser!.lastName).toBe(updateData.lastName);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        firstName: '', // Empty string should fail validation
        lastName: 'Valid',
      };

      await request(app.getHttpServer())
        .patch('/users/profile')
        .send(invalidData)
        .expect(400);
    });

    it('should reject invalid email format', async () => {
      const invalidData = {
        email: 'invalid-email-format',
      };

      await request(app.getHttpServer())
        .patch('/users/profile')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('/users/profile/preferences (GET)', () => {
    it('should get user preferences', async () => {
      const preferences = await prisma.userPreferences.create({
        data: {
          userId: testUser.id,
          dietaryRestrictions: ['vegan', 'organic'],
          allergies: ['shellfish', 'dairy'],
          preferredCategories: ['Vegetables', 'Grains'],
        },
      });

      const response = await request(app.getHttpServer())
        .get('/users/profile/preferences')
        .expect(200);

      expect(response.body).toMatchObject({
        dietaryRestrictions: preferences.dietaryRestrictions,
        allergies: preferences.allergies,
        preferredCategories: preferences.preferredCategories,
      });
    });

    it('should return empty preferences when none exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile/preferences')
        .expect(200);

      expect(response.body).toMatchObject({
        dietaryRestrictions: [],
        allergies: [],
        preferredCategories: [],
      });
    });
  });

  describe('/users/profile/preferences (PATCH)', () => {
    it('should create user preferences', async () => {
      const preferencesData = {
        dietaryRestrictions: ['vegetarian', 'gluten-free'],
        allergies: ['nuts', 'eggs'],
        preferredCategories: ['Fruits', 'Vegetables', 'Proteins'],
      };

      const response = await request(app.getHttpServer())
        .patch('/users/profile/preferences')
        .send(preferencesData)
        .expect(200);

      expect(response.body).toMatchObject(preferencesData);

      // Verify in database
      const dbPreferences = await prisma.userPreferences.findUnique({
        where: { userId: testUser.id },
      });
      expect(dbPreferences!.dietaryRestrictions).toEqual(
        preferencesData.dietaryRestrictions,
      );
      expect(dbPreferences!.allergies).toEqual(preferencesData.allergies);
      expect(dbPreferences!.preferredCategories).toEqual(
        preferencesData.preferredCategories,
      );
    });

    it('should update existing preferences', async () => {
      // Create initial preferences
      await prisma.userPreferences.create({
        data: {
          userId: testUser.id,
          dietaryRestrictions: ['vegetarian'],
          allergies: ['nuts'],
          preferredCategories: ['Fruits'],
        },
      });

      const updatedPreferences = {
        dietaryRestrictions: ['vegan'],
        allergies: ['nuts', 'dairy'],
        preferredCategories: ['Fruits', 'Vegetables'],
      };

      const response = await request(app.getHttpServer())
        .patch('/users/profile/preferences')
        .send(updatedPreferences)
        .expect(200);

      expect(response.body).toMatchObject(updatedPreferences);
    });

    it('should validate preferences arrays', async () => {
      const invalidData = {
        dietaryRestrictions: 'not-an-array', // Should be array
        allergies: ['valid'],
        preferredCategories: ['valid'],
      };

      await request(app.getHttpServer())
        .patch('/users/profile/preferences')
        .send(invalidData)
        .expect(400);
    });

    it('should handle empty arrays', async () => {
      const emptyPreferences = {
        dietaryRestrictions: [],
        allergies: [],
        preferredCategories: [],
      };

      const response = await request(app.getHttpServer())
        .patch('/users/profile/preferences')
        .send(emptyPreferences)
        .expect(200);

      expect(response.body).toMatchObject(emptyPreferences);
    });
  });

  describe('Complete User Workflow', () => {
    it('should handle complete user registration and preference setup', async () => {
      // 1. Get initial profile (should exist from beforeEach)
      const profileResponse = await request(app.getHttpServer())
        .get('/users/profile')
        .expect(200);

      expect(profileResponse.body.email).toBe(testUser.email);

      // 2. Update profile information
      const updatedProfile = {
        firstName: 'Updated',
        lastName: 'User',
      };

      await request(app.getHttpServer())
        .patch('/users/profile')
        .send(updatedProfile)
        .expect(200);

      // 3. Set up preferences
      const preferences = {
        dietaryRestrictions: ['vegetarian', 'organic'],
        allergies: ['nuts', 'shellfish'],
        preferredCategories: ['Fruits', 'Vegetables'],
      };

      await request(app.getHttpServer())
        .patch('/users/profile/preferences')
        .send(preferences)
        .expect(200);

      // 4. Verify complete profile with preferences
      const finalProfileResponse = await request(app.getHttpServer())
        .get('/users/profile')
        .expect(200);

      expect(finalProfileResponse.body.firstName).toBe(
        updatedProfile.firstName,
      );
      expect(finalProfileResponse.body.lastName).toBe(updatedProfile.lastName);
      expect(finalProfileResponse.body.preferences).toMatchObject(preferences);
    });

    it('should handle preference updates over time', async () => {
      // Initial preferences
      const initialPreferences = {
        dietaryRestrictions: ['vegetarian'],
        allergies: ['nuts'],
        preferredCategories: ['Fruits'],
      };

      await request(app.getHttpServer())
        .patch('/users/profile/preferences')
        .send(initialPreferences)
        .expect(200);

      // Update to vegan
      const veganPreferences = {
        dietaryRestrictions: ['vegan'],
        allergies: ['nuts', 'dairy'],
        preferredCategories: ['Fruits', 'Vegetables'],
      };

      await request(app.getHttpServer())
        .patch('/users/profile/preferences')
        .send(veganPreferences)
        .expect(200);

      // Add more allergies
      const finalPreferences = {
        dietaryRestrictions: ['vegan', 'organic'],
        allergies: ['nuts', 'dairy', 'shellfish'],
        preferredCategories: ['Fruits', 'Vegetables', 'Grains'],
      };

      const response = await request(app.getHttpServer())
        .patch('/users/profile/preferences')
        .send(finalPreferences)
        .expect(200);

      expect(response.body).toMatchObject(finalPreferences);
    });
  });

  describe('Error Handling', () => {
    it('should return proper error format', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .send({ firstName: '' }) // Invalid data
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Admin Endpoints', () => {
    beforeEach(() => {
      // Mock admin role
      mockAuthGuard.canActivate.mockImplementation((context) => {
        const request = context.switchToHttp().getRequest();
        request.user = {
          sub: testUser.keycloakId,
          email: testUser.email,
          preferred_username: 'admin',
          given_name: testUser.firstName,
          family_name: testUser.lastName,
          roles: ['admin'],
        };
        return true;
      });
    });

    it('should return 401 when no token provided (admin only)', () => {
      mockAuthGuard.canActivate.mockReturnValueOnce(false);

      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should return 401 when invalid token provided (admin only)', () => {
      mockAuthGuard.canActivate.mockReturnValueOnce(false);

      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 when no token provided for POST', () => {
      mockAuthGuard.canActivate.mockReturnValueOnce(false);

      return request(app.getHttpServer())
        .post('/users')
        .send({
          keycloakId: 'test-keycloak-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(401);
    });
  });
});
