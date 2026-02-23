import { Test, TestingModule } from '@nestjs/testing';
import { MissionProgressService } from './missionProgress.service';
import { MissionProgressRepository } from '../repositories/missionProgress.repository';

describe('MissionProgressService', () => {
	let service: MissionProgressService;
	let repository: MissionProgressRepository;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				MissionProgressService,
				{
					provide: MissionProgressRepository,
					useValue: {
						findByUserIdAndMissionId: jest.fn(),
						findAllByUserId: jest.fn(),
						update: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<MissionProgressService>(MissionProgressService);
		repository = module.get<MissionProgressRepository>(MissionProgressRepository);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('getMissionById', () => {
		it('should return mission progress if found and userId matches', async () => {
			const progress = { missionId: 'm1', userId: 'u1', completed: false, progress: 0.5, mission: { title: 'Test Mission' } };
			(repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(progress);
			const result = await service.getMissionById('m1', 'u1');
			expect(result).toEqual({
				missionId: 'm1',
				userId: 'u1',
				completed: false,
				progress: 0.5,
				missionTitle: 'Test Mission',
			});
		});

		it('should throw NotFoundException if progress not found', async () => {
			(repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(null);
			await expect(service.getMissionById('m1', 'u1')).rejects.toThrow('Mission not found');
		});

		it('should throw ForbiddenException if userId does not match', async () => {
			const progress = { missionId: 'm1', userId: 'other', completed: false, progress: 0.5, mission: { title: 'Test Mission' } };
			(repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(progress);
			await expect(service.getMissionById('m1', 'u1')).rejects.toThrow('No permission');
		});
	});

	describe('getAllMissionByUserId', () => {
		it('should return all mission progresses for user', async () => {
			const progresses = [
				{ missionId: 'm1', userId: 'u1', completed: false, progress: 0.5, mission: { title: 'Test Mission 1' } },
				{ missionId: 'm2', userId: 'u1', completed: true, progress: 1, mission: { title: 'Test Mission 2' } },
			];
			(repository.findAllByUserId as jest.Mock).mockResolvedValue(progresses);
			const result = await service.getAllMissionByUserId('u1');
			expect(result).toEqual([
				{ missionId: 'm1', userId: 'u1', completed: false, progress: 0.5, missionTitle: 'Test Mission 1' },
				{ missionId: 'm2', userId: 'u1', completed: true, progress: 1, missionTitle: 'Test Mission 2' },
			]);
		});
	});

	describe('update', () => {
		it('should update and return mission progress if found and userId matches', async () => {
			const existing = { missionId: 'm1', userId: 'u1', completed: false, progress: 0.5, mission: { title: 'Test Mission' } };
			const updated = { missionId: 'm1', userId: 'u1', completed: true, progress: 1, mission: { title: 'Test Mission' } };
			(repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(existing);
			(repository.update as jest.Mock).mockResolvedValue(updated);
			const result = await service.update('m1', { completed: true, progress: 1 }, 'u1');
			expect(result).toEqual({
				missionId: 'm1',
				userId: 'u1',
				completed: true,
				progress: 1,
				missionTitle: 'Test Mission',
			});
		});

		it('should throw NotFoundException if progress not found', async () => {
			(repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(null);
			await expect(service.update('m1', { completed: true }, 'u1')).rejects.toThrow('Mission not found');
		});

		it('should throw ForbiddenException if userId does not match', async () => {
			const existing = { missionId: 'm1', userId: 'other', completed: false, progress: 0.5, mission: { title: 'Test Mission' } };
			(repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(existing);
			await expect(service.update('m1', { completed: true }, 'u1')).rejects.toThrow('No permission');
		});
	});
});
