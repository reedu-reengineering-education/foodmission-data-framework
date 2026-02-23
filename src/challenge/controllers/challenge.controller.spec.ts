
import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeController } from './challenge.controller';
import { ChallengeService } from '../services/challenge.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

describe('ChallengeController', () => {
	let controller: ChallengeController;
	let service: ChallengeService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [ChallengeController],
			providers: [
				{
					provide: ChallengeService,
					useValue: {
						create: jest.fn(),
						getAll: jest.fn(),
						getChallengeById: jest.fn(),
						update: jest.fn(),
						delete: jest.fn(),
					},
				},
			],
		})
			.overrideGuard(ThrottlerGuard)
			.useValue({ canActivate: () => true })
			.overrideGuard(DataBaseAuthGuard)
			.useValue({ canActivate: () => true })
			.compile();

		controller = module.get<ChallengeController>(ChallengeController);
		service = module.get<ChallengeService>(ChallengeService);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('create', () => {
		it('should call service.create and return result', async () => {
			const mockResult = { id: 'c1', title: 'Test Challenge' };
			(service.create as jest.Mock).mockResolvedValue(mockResult);
			const dto = { title: 'Test', description: 'Desc', startDate: new Date(), endDate: new Date() };
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
