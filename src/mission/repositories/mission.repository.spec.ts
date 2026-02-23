import { Test, TestingModule } from '@nestjs/testing';
import { MissionRepository } from './mission.repository';
import { PrismaService } from '../../database/prisma.service';

describe('MissionRepository', () => {
	let repository: MissionRepository;
	let prisma: PrismaService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				MissionRepository,
				{
					provide: PrismaService,
					useValue: {
						mission: {
							create: jest.fn(),
							findUnique: jest.fn(),
							findMany: jest.fn(),
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

		repository = module.get<MissionRepository>(MissionRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it('should be defined', () => {
		expect(repository).toBeDefined();
	});

	describe('create', () => {
		it('should call prisma.mission.create with missionProgresses for all users', async () => {
			const data = { userId: 'u1', title: 't', description: 'd', available: true, startDate: new Date(), endDate: new Date() };
			const mockUsers = [{ id: 'u1' }, { id: 'u2' }];
			const mockReturn = { id: 'm1', missionProgresses: [] };
			(prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
			(prisma.mission.create as jest.Mock).mockResolvedValue(mockReturn);
			const result = await repository.create(data);
			expect(prisma.user.findMany).toHaveBeenCalledWith({ select: { id: true } });
			expect(prisma.mission.create).toHaveBeenCalledWith({
				data: {
					title: data.title,
					description: data.description,
					available: data.available,
					startDate: data.startDate,
					endDate: data.endDate,
					missionProgresses: {
						create: [
							{ userId: 'u1', progress: 0, completed: false },
							{ userId: 'u2', progress: 0, completed: false },
						],
					},
				},
				include: { missionProgresses: true },
			});
			expect(result).toBe(mockReturn);
		});
	});

	describe('findById', () => {
		it('should call prisma.mission.findUnique with include missionProgresses', async () => {
			const mockReturn = { id: 'm1', missionProgresses: [] };
			(prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockReturn);
			const result = await repository.findById('m1');
			expect(prisma.mission.findUnique).toHaveBeenCalledWith({ where: { id: 'm1' }, include: { missionProgresses: true } });
			expect(result).toBe(mockReturn);
		});
	});

	describe('findAll', () => {
		it('should call prisma.mission.findMany with include missionProgresses', async () => {
			const mockReturn = [{ id: 'm1', missionProgresses: [] }];
			(prisma.mission.findMany as jest.Mock).mockResolvedValue(mockReturn);
			const result = await repository.findAll();
			expect(prisma.mission.findMany).toHaveBeenCalledWith({ include: { missionProgresses: true } });
			expect(result).toBe(mockReturn);
		});
	});

	describe('update', () => {
		it('should call prisma.mission.update with include missionProgresses', async () => {
			const mockReturn = { id: 'm1', missionProgresses: [] };
			const updateData = { available: false };
			(prisma.mission.update as jest.Mock).mockResolvedValue(mockReturn);
			const result = await repository.update('m1', updateData);
			expect(prisma.mission.update).toHaveBeenCalledWith({
				where: { id: 'm1' },
				data: {
					title: undefined,
					description: undefined,
					available: updateData.available,
					startDate: undefined,
					endDate: undefined,
				},
				include: { missionProgresses: true },
			});
			expect(result).toBe(mockReturn);
		});
	});

	describe('delete', () => {
		it('should call prisma.mission.delete with correct params', async () => {
			(prisma.mission.delete as jest.Mock).mockResolvedValue(undefined);
			await repository.delete('m1');
			expect(prisma.mission.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
		});
	});
});
