
import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeRepository } from './challenge.repository';
import { PrismaService } from '../../database/prisma.service';

describe('ChallengeRepository', () => {
	let repository: ChallengeRepository;
	let prisma: PrismaService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ChallengeRepository,
				{
					provide: PrismaService,
					useValue: {
						challenge: {
							create: jest.fn(),
							findMany: jest.fn(),
							findUnique: jest.fn(),
							update: jest.fn(),
							delete: jest.fn(),
						},
						user: {
							findMany: jest.fn(),
						},
					},
				},
			],
		}).compile();

		repository = module.get<ChallengeRepository>(ChallengeRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it('should be defined', () => {
		expect(repository).toBeDefined();
	});

	describe('create', () => {
		it('should create challenge with progress for all users', async () => {
			const dto = { title: 'Test', description: 'Desc', available: true, startDate: new Date(), endDate: new Date() };
			const mockUsers = [{ id: 'u1' }, { id: 'u2' }];
			const mockChallenge = { id: 'c1', ...dto, challengeProgresses: [] };
			(prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
			(prisma.challenge.create as jest.Mock).mockResolvedValue(mockChallenge);

			const result = await repository.create(dto);

			expect(prisma.user.findMany).toHaveBeenCalledWith({ select: { id: true } });
			expect(prisma.challenge.create).toHaveBeenCalledWith({
				data: {
					...dto,
					challengeProgresses: {
						create: [
							{ userId: 'u1', progress: 0, completed: false },
							{ userId: 'u2', progress: 0, completed: false },
						],
					},
				},
				include: { challengeProgresses: true },
			});
			expect(result).toBe(mockChallenge);
		});
	});

	describe('findAll', () => {
		it('should return all challenges with progress', async () => {
			const mockChallenges = [{ id: 'c1', challengeProgresses: [] }];
			(prisma.challenge.findMany as jest.Mock).mockResolvedValue(mockChallenges);

			const result = await repository.findAll();

			expect(prisma.challenge.findMany).toHaveBeenCalledWith({ include: { challengeProgresses: true } });
			expect(result).toBe(mockChallenges);
		});
	});

	describe('findById', () => {
		it('should return challenge by id with progress', async () => {
			const mockChallenge = { id: 'c1', challengeProgresses: [] };
			(prisma.challenge.findUnique as jest.Mock).mockResolvedValue(mockChallenge);

			const result = await repository.findById('c1');

			expect(prisma.challenge.findUnique).toHaveBeenCalledWith({
				where: { id: 'c1' },
				include: { challengeProgresses: true },
			});
			expect(result).toBe(mockChallenge);
		});

		it('should return null if challenge not found', async () => {
			(prisma.challenge.findUnique as jest.Mock).mockResolvedValue(null);

			const result = await repository.findById('nonexistent');

			expect(result).toBeNull();
		});
	});

	describe('update', () => {
		it('should update challenge', async () => {
			const updateDto = { available: false };
			const mockChallenge = { id: 'c1', available: false };
			(prisma.challenge.update as jest.Mock).mockResolvedValue(mockChallenge);

			const result = await repository.update('c1', updateDto);

			expect(prisma.challenge.update).toHaveBeenCalledWith({
				where: { id: 'c1' },
				data: { ...updateDto },
			});
			expect(result).toBe(mockChallenge);
		});
	});

	describe('delete', () => {
		it('should delete challenge', async () => {
			const mockChallenge = { id: 'c1' };
			(prisma.challenge.delete as jest.Mock).mockResolvedValue(mockChallenge);

			const result = await repository.delete('c1');

			expect(prisma.challenge.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
			expect(result).toBe(mockChallenge);
		});
	});
});
