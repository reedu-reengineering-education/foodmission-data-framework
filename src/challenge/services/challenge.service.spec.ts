
import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeService } from './challenge.service';
import { ChallengeRepository } from '../repositories/challenge.repository';

describe('ChallengeService', () => {
	let service: ChallengeService;
	let repository: ChallengeRepository;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ChallengeService,
				{
					provide: ChallengeRepository,
					useValue: {
						create: jest.fn(),
						findAll: jest.fn(),
						findById: jest.fn(),
						update: jest.fn(),
						delete: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<ChallengeService>(ChallengeService);
		repository = module.get<ChallengeRepository>(ChallengeRepository);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	// Add more tests for create, getAll, getChallengeById, update, delete
});
