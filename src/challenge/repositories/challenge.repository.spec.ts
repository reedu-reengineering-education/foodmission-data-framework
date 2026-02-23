
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

	// Add more tests for create, findAll, findById, update, delete
});
