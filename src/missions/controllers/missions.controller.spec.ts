import { Test, TestingModule } from '@nestjs/testing';
import { MissionsController } from './missions.controller';
import { MissionsService } from '../services/missions.service';
import { MissionProgressService } from '../services/mission-progress.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

describe('MissionsController', () => {
  let controller: MissionsController;
  let service: MissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissionsController],
      providers: [
        {
          provide: MissionsService,
          useValue: {
            create: jest.fn(),
            getMissionById: jest.fn(),
            getAllMissions: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: MissionProgressService,
          useValue: {
            getMissionById: jest.fn(),
            getAllMissionsByUserId: jest.fn(),
            getAllPaginated: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MissionsController>(MissionsController);
    service = module.get<MissionsService>(MissionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return result', async () => {
      const mockResult = { id: 'm1' };
      (service.create as jest.Mock).mockResolvedValue(mockResult);
      const dto = {
        code: 'M.B1.1',
        dimensionId: 'dim-1',
        level: 'BEGINNER' as const,
        title: 't',
        duration: '1 week',
        goal: 'g',
        whyItMatters: 'w',
        available: true,
      };
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(mockResult);
    });
  });

  describe('getMissionById', () => {
    it('should call service.getMissionById and return result', async () => {
      const mockResult = { id: 'm1' };
      (service.getMissionById as jest.Mock).mockResolvedValue(mockResult);
      const result = await controller.getMissionById('m1', {});
      expect(service.getMissionById).toHaveBeenCalledWith('m1', undefined);
      expect(result).toBe(mockResult);
    });
  });

  describe('getAllMissions', () => {
    it('should pass isAdmin=false for non-admin Keycloak roles', async () => {
      (service.getAllMissions as jest.Mock).mockResolvedValue([]);
      await controller.getAllMissions(
        {},
        {
          user: {
            resource_access: {
              'foodmission-api': { roles: ['user'] },
            },
          },
        },
        'u1',
      );
      expect(service.getAllMissions).toHaveBeenCalledWith(
        {},
        {
          isAdmin: false,
          userId: 'u1',
        },
      );
    });

    it('should pass isAdmin=true for Keycloak admin role', async () => {
      (service.getAllMissions as jest.Mock).mockResolvedValue([]);
      await controller.getAllMissions(
        {},
        {
          user: {
            resource_access: {
              'foodmission-api': { roles: ['admin'] },
            },
          },
        },
        'u1',
      );
      expect(service.getAllMissions).toHaveBeenCalledWith(
        {},
        {
          isAdmin: true,
          userId: 'u1',
        },
      );
    });
  });

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const mockResult = { id: 'm1' };
      (service.update as jest.Mock).mockResolvedValue(mockResult);
      const dto = { available: true };
      const result = await controller.update('m1', dto);
      expect(service.update).toHaveBeenCalledWith('m1', dto);
      expect(result).toBe(mockResult);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      (service.remove as jest.Mock).mockResolvedValue(undefined);
      await controller.remove('m1');
      expect(service.remove).toHaveBeenCalledWith('m1');
    });
  });
});
