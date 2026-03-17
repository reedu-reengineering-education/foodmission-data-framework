import { Test, TestingModule } from '@nestjs/testing';
import { MissionProgressRepository } from './mission-progress.repository';
import { PrismaService } from '../../../database/prisma.service';

describe('MissionProgressRepository', () => {
	let repository: MissionProgressRepository;
	let prisma: PrismaService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				MissionProgressRepository,
				{
					provide: PrismaService,
					useValue: {
						missionProgress: {
							findUnique: jest.fn(),
							findMany: jest.fn(),
							update: jest.fn(),
						},
					},
				},
			],
		}).compile();

		repository = module.get<MissionProgressRepository>(MissionProgressRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it('should be defined', () => {
		expect(repository).toBeDefined();
	});

	describe('findByUserIdAndMissionId', () => {
		it('should call prisma.missionProgress.findUnique with correct params', async () => {
			const mockReturn = { id: '1' };
			(prisma.missionProgress.findUnique as jest.Mock).mockResolvedValue(mockReturn);
			const result = await repository.findByUserIdAndMissionId('u1', 'm1');
			expect(prisma.missionProgress.findUnique).toHaveBeenCalledWith({
				where: { userId_missionId: { userId: 'u1', missionId: 'm1' } },
				include: { mission: true },
			});
			expect(result).toBe(mockReturn);
		});
	});

	describe('findAllByUserId', () => {
		it('should call prisma.missionProgress.findMany with correct params', async () => {
			const mockReturn = [{ id: '1' }];
			(prisma.missionProgress.findMany as jest.Mock).mockResolvedValue(mockReturn);
			const result = await repository.findAllByUserId('u1');
			expect(prisma.missionProgress.findMany).toHaveBeenCalledWith({
				where: { userId: 'u1' },
				include: { mission: true },
			});
			expect(result).toBe(mockReturn);
		});
	});

	describe('update', () => {
		it('should call prisma.missionProgress.update with correct params', async () => {
			const mockReturn = { id: '1' };
			const updateDto = { completed: true };
			(prisma.missionProgress.update as jest.Mock).mockResolvedValue(mockReturn);
			const result = await repository.update('u1', 'm1', updateDto);
			expect(prisma.missionProgress.update).toHaveBeenCalledWith({
				where: { userId_missionId: { userId: 'u1', missionId: 'm1' } },
				data: { ...updateDto },
				include: { mission: true },
			});
			expect(result).toBe(mockReturn);
		});
	});
});
