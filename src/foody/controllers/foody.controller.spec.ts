import { ThrottlerGuard } from '@nestjs/throttler';
import { Test, TestingModule } from '@nestjs/testing';
import { FoodyItemType } from '@prisma/client';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { FoodyService } from '../services/foody.service';
import { FoodyController } from './foody.controller';

describe('FoodyController', () => {
  let controller: FoodyController;
  let service: FoodyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodyController],
      providers: [
        {
          provide: FoodyService,
          useValue: {
            listForUser: jest.fn(),
            getLoadout: jest.fn(),
            purchase: jest.fn(),
            equip: jest.fn(),
            unequip: jest.fn(),
            create: jest.fn(),
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

    controller = module.get<FoodyController>(FoodyController);
    service = module.get<FoodyService>(FoodyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listItems', () => {
    it('passes isAdmin=false for a plain user', async () => {
      (service.listForUser as jest.Mock).mockResolvedValue([]);

      await controller.listItems({ type: FoodyItemType.EARS }, 'u1', {
        user: { resource_access: {} },
      });

      expect(service.listForUser).toHaveBeenCalledWith(
        'u1',
        { type: FoodyItemType.EARS },
        { isAdmin: false },
      );
    });

    it('passes isAdmin=true when the token carries the admin role', async () => {
      (service.listForUser as jest.Mock).mockResolvedValue([]);

      const clientId = process.env.KEYCLOAK_CLIENT_ID || 'foodmission-api';
      await controller.listItems({}, 'u1', {
        user: { resource_access: { [clientId]: { roles: ['admin'] } } },
      });

      expect(service.listForUser).toHaveBeenCalledWith(
        'u1',
        {},
        {
          isAdmin: true,
        },
      );
    });
  });

  describe('purchase', () => {
    it('calls service.purchase with the user and item', async () => {
      const mockResult = { pricePaid: 150 };
      (service.purchase as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.purchase('GLASSES_3', 'u1');

      expect(service.purchase).toHaveBeenCalledWith('u1', 'GLASSES_3');
      expect(result).toBe(mockResult);
    });
  });

  describe('equip', () => {
    it('calls service.equip with the user and item', async () => {
      await controller.equip('EARS_2', 'u1');
      expect(service.equip).toHaveBeenCalledWith('u1', 'EARS_2');
    });

    it('calls service.unequip on delete', async () => {
      await controller.unequip('EARS_2', 'u1');
      expect(service.unequip).toHaveBeenCalledWith('u1', 'EARS_2');
    });
  });
});
