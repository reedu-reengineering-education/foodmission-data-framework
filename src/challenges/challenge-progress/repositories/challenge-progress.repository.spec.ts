
import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeProgressRepository } from './challenge-progress.repository';
import { PrismaService } from '../../../database/prisma.service';

describe('ChallengeProgressRepository', () => {
	let repository: ChallengeProgressRepository;
	let prisma: PrismaService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ChallengeProgressRepository,
				{
					provide: PrismaService,
					useValue: {
						challengeProgress: {
							findUnique: jest.fn(),
							findMany: jest.fn(),
							update: jest.fn(),
						},
					},
				},
			],
		}).compile();

		repository = module.get<ChallengeProgressRepository>(ChallengeProgressRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it('should be defined', () => {
		expect(repository).toBeDefined();
	});

	describe('findByUserIdAndChallengeId', () => {
		it('should call prisma.challengeProgress.findUnique with correct params', async () => {
			const mockReturn = { userId: 'u1', challengeId: 'c1', completed: false, progress: 0.5, challenge: { title: 'Test' } };
			(prisma.challengeProgress.findUnique as jest.Mock).mockResolvedValue(mockReturn);
			const result = await repository.findByUserIdAndChallengeId('u1', 'c1');
			expect(prisma.challengeProgress.findUnique).toHaveBeenCalledWith({
				where: { userId_challengeId: { userId: 'u1', challengeId: 'c1' } },
				include: { challenge: true },
			});
			expect(result).toBe(mockReturn);
		});
	});

	describe('findAllByUserId', () => {
		it('should call prisma.challengeProgress.findMany with correct params', async () => {
			const mockReturn = [{ userId: 'u1', challengeId: 'c1' }];
			(prisma.challengeProgress.findMany as jest.Mock).mockResolvedValue(mockReturn);
			const result = await repository.findAllByUserId('u1');
			expect(prisma.challengeProgress.findMany).toHaveBeenCalledWith({
				where: { userId: 'u1' },
				include: { challenge: true },
			});
			expect(result).toBe(mockReturn);
		});
	});

	describe('update', () => {
		it('should call prisma.challengeProgress.update with correct params', async () => {
			const mockReturn = { userId: 'u1', challengeId: 'c1', completed: true, progress: 1 };
			const updateDto = { completed: true, progress: 1 };
			(prisma.challengeProgress.update as jest.Mock).mockResolvedValue(mockReturn);
			const result = await repository.update('u1', 'c1', updateDto);
			expect(prisma.challengeProgress.update).toHaveBeenCalledWith({
				where: { userId_challengeId: { userId: 'u1', challengeId: 'c1' } },
				data: { ...updateDto },
				include: { challenge: true },
			});
			expect(result).toBe(mockReturn);
		});
	});
});
