import { Test, TestingModule } from '@nestjs/testing';
import { MissionController } from './mission.controller';
import { MissionService } from '../services/mission.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

describe('MissionController', () => {
	let controller: MissionController;
	let service: MissionService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [MissionController],
			providers: [
				{
					provide: MissionService,
					useValue: {
						create: jest.fn(),
						getMissionById: jest.fn(),
						update: jest.fn(),
						remove: jest.fn(),
					},
				},
			],
		})
			.overrideGuard(ThrottlerGuard)
			.useValue({ canActivate: () => true })
			.overrideGuard(DataBaseAuthGuard)
			.useValue({ canActivate: () => true })
			.compile();

		controller = module.get<MissionController>(MissionController);
		service = module.get<MissionService>(MissionService);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('create', () => {
		it('should call service.create and return result', async () => {
			const mockResult = { id: 'm1' };
			(service.create as jest.Mock).mockResolvedValue(mockResult);
			const dto = { title: 't', description: 'd', available: true, startDate: new Date(), endDate: new Date() };
			const result = await controller.create(dto, 'u1');
			expect(service.create).toHaveBeenCalledWith(dto, 'u1');
			expect(result).toBe(mockResult);
		});
	});

	describe('getMissionById', () => {
		it('should call service.getMissionById and return result', async () => {
			const mockResult = { id: 'm1' };
			(service.getMissionById as jest.Mock).mockResolvedValue(mockResult);
			const result = await controller.getMissionById('m1');
			expect(service.getMissionById).toHaveBeenCalledWith('m1');
			expect(result).toBe(mockResult);
		});
	});

	describe('update', () => {
		it('should call service.update and return result', async () => {
			const mockResult = { id: 'm1' };
			(service.update as jest.Mock).mockResolvedValue(mockResult);
			const dto = { available : true };
			const result = await controller.update('m1', dto);
			expect(service.update).toHaveBeenCalledWith('m1', dto);
			expect(result).toBe(mockResult);
		});
	});

	describe('remove', () => {
		it('should call service.remove', async () => {
			(service.remove as jest.Mock).mockResolvedValue(undefined);
			await controller.remove('m1', 'u1');
			expect(service.remove).toHaveBeenCalledWith('m1');
		});
	});
});
