import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeProgressController } from './challenge-progress.controller';
import { ChallengeProgressService } from '../services/challenge-progress.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../../common/guards/database-auth.guards';

describe('ChallengeProgressController', () => {
	let controller: ChallengeProgressController;
	let service: ChallengeProgressService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [ChallengeProgressController],
			providers: [
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

		controller = module.get<ChallengeProgressController>(ChallengeProgressController);
		service = module.get<ChallengeProgressService>(ChallengeProgressService);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('getAll', () => {
		it('should call service.getAllChallengesByUserId and return result', async () => {
			const mockResult = [
				{ challengeId: 'c1', userId: 'u1', completed: false, progress: 0.5, challengeTitle: 'Challenge 1' },
			];
			(service.getAllChallengesByUserId as jest.Mock).mockResolvedValue(mockResult);
			const result = await controller.getAll('u1');
			expect(service.getAllChallengesByUserId).toHaveBeenCalledWith('u1');
			expect(result).toBe(mockResult);
		});
	});

	describe('getChallengeById', () => {
		it('should call service.getChallengeById and return result', async () => {
			const mockResult = { challengeId: 'c1', userId: 'u1', completed: false, progress: 0.5, challengeTitle: 'Test' };
			(service.getChallengeById as jest.Mock).mockResolvedValue(mockResult);
			const result = await controller.getChallengeById('c1', 'u1');
			expect(service.getChallengeById).toHaveBeenCalledWith('c1', 'u1');
			expect(result).toBe(mockResult);
		});
	});

	describe('update', () => {
		it('should call service.update and return result', async () => {
			const mockResult = { challengeId: 'c1', userId: 'u1', completed: true, progress: 1, challengeTitle: 'Test' };
			(service.update as jest.Mock).mockResolvedValue(mockResult);
			const dto = { completed: true, progress: 1 };
			const result = await controller.update('c1', dto, 'u1');
			expect(service.update).toHaveBeenCalledWith('c1', dto, 'u1');
			expect(result).toBe(mockResult);
		});
	});
});
