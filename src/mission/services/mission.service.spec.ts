
import { Test, TestingModule } from '@nestjs/testing';
import { MissionService } from './mission.service';
import { MissionRepository } from '../repositories/mission.repository';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('MissionService', () => {
	let service: MissionService;
	let repository: MissionRepository;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				MissionService,
				{
					provide: MissionRepository,
					useValue: {
						create: jest.fn(),
						findById: jest.fn(),
						findAll: jest.fn(),
						update: jest.fn(),
						delete: jest.fn(),
					},
				},
				{
					provide: PrismaService,
					useValue: {},
				},
			],
		}).compile();

		service = module.get<MissionService>(MissionService);
		repository = module.get<MissionRepository>(MissionRepository);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('create', () => {
		it('should call repository.create and return transformed result', async () => {
			const dto = { title: 't', description: 'd', available: true, startDate: new Date(), endDate: new Date() };
			const mockMission = { ...dto, id: 'm1', progress: 0 };
			(repository.create as jest.Mock).mockResolvedValue(mockMission);
			const result = await service.create(dto, 'u1');
			expect(repository.create).toHaveBeenCalledWith({ ...dto, userId: 'u1' });
			expect(result).toMatchObject({ id: 'm1', title: 't' });
		});
	});

	describe('getMissionById', () => {
		it('should return mission if found', async () => {
			const mockMission = { id: 'm1', title: 't', description: 'd', startDate: new Date(), endDate: new Date(), progress: 0, available: true };
			(repository.findById as jest.Mock).mockResolvedValue(mockMission);
			const result = await service.getMissionById('m1');
			expect(repository.findById).toHaveBeenCalledWith('m1');
			expect(result).toMatchObject({ id: 'm1', title: 't' });
		});
		it('should throw NotFoundException if mission not found', async () => {
			(repository.findById as jest.Mock).mockResolvedValue(null);
			await expect(service.getMissionById('m1')).rejects.toThrow(NotFoundException);
		});
	});

	describe('update', () => {
		it('should call repository.update and return transformed result', async () => {
			const updatedMission = { id: 'm1', title: 't', description: 'd', available: true, startDate: new Date(), endDate: new Date(), missionProgresses: [] };
			(repository.update as jest.Mock).mockResolvedValue(updatedMission);
			const result = await service.update('m1', { available: true });
			expect(repository.update).toHaveBeenCalledWith('m1', { available: true });
			expect(result).toMatchObject({ id: 'm1', available: true });
		});
	});

	describe('remove', () => {
		it('should call repository.delete', async () => {
			(repository.delete as jest.Mock).mockResolvedValue(undefined);
			await service.remove('m1');
			expect(repository.delete).toHaveBeenCalledWith('m1');
		});
	});
});
