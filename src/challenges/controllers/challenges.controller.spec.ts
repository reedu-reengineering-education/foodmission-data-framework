import { Test, TestingModule } from '@nestjs/testing';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from '../services/challenges.service';
import { ChallengeProgressService } from '../services/challenge-progress.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

describe('ChallengesController', () => {
  let controller: ChallengesController;
  let service: ChallengesService;
  let progressService: ChallengeProgressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChallengesController],
      providers: [
        {
          provide: ChallengesService,
          useValue: {
            create: jest.fn(),
            getAll: jest.fn(),
            getChallengeById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ChallengeProgressService,
          useValue: {
            getChallengeById: jest.fn(),
            getAllChallengesByUserId: jest.fn(),
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

    controller = module.get<ChallengesController>(ChallengesController);
    service = module.get<ChallengesService>(ChallengesService);
    progressService = module.get<ChallengeProgressService>(
      ChallengeProgressService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return result', async () => {
      const mockResult = { id: 'c1', title: 'Test Challenge' };
      (service.create as jest.Mock).mockResolvedValue(mockResult);
      const dto = {
        code: 'CH.B1.1',
        dimensionId: 'dim-1',
        level: 'BEGINNER' as const,
        title: 'Test',
        task: 'Task',
        whyItMatters: 'Why',
        tags: ['FOOD_CHOICE'],
        available: true,
      };
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(mockResult);
    });
  });

  describe('getAll', () => {
    it('should call service.getAll and return result', async () => {
      const mockResult = [{ id: 'c1', title: 'Test' }];
      (service.getAll as jest.Mock).mockResolvedValue(mockResult);
      const result = await controller.getAll(
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
      expect(service.getAll).toHaveBeenCalledWith({}, {
        isAdmin: false,
        userId: 'u1',
      });
      expect(result).toBe(mockResult);
    });

    it('should treat Keycloak resource_access admin as admin', async () => {
      (service.getAll as jest.Mock).mockResolvedValue([]);
      await controller.getAll(
        {},
        {
          user: {
            resource_access: {
              'foodmission-api': { roles: ['user', 'admin'] },
            },
          },
        },
        'u1',
      );
      expect(service.getAll).toHaveBeenCalledWith({}, {
        isAdmin: true,
        userId: 'u1',
      });
    });
  });

  describe('getChallengeById', () => {
    it('should call service.getChallengeById and return result', async () => {
      const mockResult = { id: 'c1', title: 'Test' };
      (service.getChallengeById as jest.Mock).mockResolvedValue(mockResult);
      const result = await controller.getChallengeById('c1', {});
      expect(service.getChallengeById).toHaveBeenCalledWith('c1', undefined);
      expect(result).toBe(mockResult);
    });
  });

  describe('getChallengeByCode', () => {
    it('should call service.getChallengeById with the code', async () => {
      const mockResult = { id: 'c1', code: 'CH.A1.1' };
      (service.getChallengeById as jest.Mock).mockResolvedValue(mockResult);
      const result = await controller.getChallengeByCode('CH.A1.1', {});
      expect(service.getChallengeById).toHaveBeenCalledWith(
        'CH.A1.1',
        undefined,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('getProgressByCode', () => {
    it('should call progressService.getChallengeById with the code', async () => {
      const mockResult = { challengeId: 'c1', progress: 10 };
      (progressService.getChallengeById as jest.Mock).mockResolvedValue(
        mockResult,
      );
      const result = await controller.getProgressByCode('CH.A1.1', 'u1', {});
      expect(progressService.getChallengeById).toHaveBeenCalledWith(
        'CH.A1.1',
        'u1',
        undefined,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('updateProgressByCode', () => {
    it('should call progressService.update with the code', async () => {
      const mockResult = { challengeId: 'c1', progress: 10 };
      (progressService.update as jest.Mock).mockResolvedValue(mockResult);
      const dto = { progress: 10 };
      const result = await controller.updateProgressByCode(
        'CH.A1.1',
        dto,
        'u1',
        {},
      );
      expect(progressService.update).toHaveBeenCalledWith(
        'CH.A1.1',
        dto,
        'u1',
        undefined,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const mockResult = { id: 'c1', available: true };
      (service.update as jest.Mock).mockResolvedValue(mockResult);
      const dto = { available: true };
      const result = await controller.update('c1', dto);
      expect(service.update).toHaveBeenCalledWith('c1', dto);
      expect(result).toBe(mockResult);
    });
  });

  describe('delete', () => {
    it('should call service.delete', async () => {
      (service.delete as jest.Mock).mockResolvedValue(undefined);
      await controller.delete('c1');
      expect(service.delete).toHaveBeenCalledWith('c1');
    });
  });
});
