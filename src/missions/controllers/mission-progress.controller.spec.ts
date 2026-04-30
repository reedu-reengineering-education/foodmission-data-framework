import { Test, TestingModule } from '@nestjs/testing';
import { MissionProgressService } from '../services/mission-progress.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { MissionProgressController } from './mission-progress.controller';

describe('MissionProgressController', () => {
  let controller: MissionProgressController;
  let service: MissionProgressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissionProgressController],
      providers: [
        {
          provide: MissionProgressService,
          useValue: {
            getMissionById: jest.fn(),
            getAllMissionsByUserId: jest.fn(),
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

    controller = module.get<MissionProgressController>(
      MissionProgressController,
    );
    service = module.get<MissionProgressService>(MissionProgressService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMissionById', () => {
    it('should call service.getMissionById and return result', async () => {
      const mockResult = { missionId: 'm1' };
      (service.getMissionById as jest.Mock).mockResolvedValue(mockResult);
      const result = await controller.getMissionById('m1', 'u1');
      expect(service.getMissionById).toHaveBeenCalledWith('m1', 'u1');
      expect(result).toBe(mockResult);
    });
  });

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const mockResult = { missionId: 'm1', completed: true };
      (service.update as jest.Mock).mockResolvedValue(mockResult);
      const dto = { completed: true };
      const result = await controller.update('m1', dto, 'u1');
      expect(service.update).toHaveBeenCalledWith('m1', dto, 'u1');
      expect(result).toBe(mockResult);
    });
  });
});
