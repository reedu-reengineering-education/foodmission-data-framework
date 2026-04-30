import { Test, TestingModule } from '@nestjs/testing';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from '../services/challenges.service';
import { ChallengeProgressService } from '../services/challenge-progress.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

describe('ChallengesController', () => {
  let controller: ChallengesController;
  let service: ChallengesService;

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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return result', async () => {
      const mockResult = { id: 'c1', title: 'Test Challenge' };
      (service.create as jest.Mock).mockResolvedValue(mockResult);
      const dto = {
        title: 'Test',
        description: 'Desc',
        available: true,
        startDate: new Date(),
        endDate: new Date(),
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
      const result = await controller.getAll();
      expect(service.getAll).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });
  });

  describe('getChallengeById', () => {
    it('should call service.getChallengeById and return result', async () => {
      const mockResult = { id: 'c1', title: 'Test' };
      (service.getChallengeById as jest.Mock).mockResolvedValue(mockResult);
      const result = await controller.getChallengeById('c1');
      expect(service.getChallengeById).toHaveBeenCalledWith('c1');
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
