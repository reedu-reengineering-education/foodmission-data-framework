import { Test, TestingModule } from '@nestjs/testing';
import { RewardSourceType, WalletCurrency } from '@prisma/client';
import { GamificationWalletService } from './gamification-wallet.service';
import { CompletionRewardService } from './completion-reward.service';

describe('CompletionRewardService', () => {
  let service: CompletionRewardService;
  let walletService: jest.Mocked<Pick<GamificationWalletService, 'award'>>;

  beforeEach(async () => {
    walletService = {
      award: jest.fn().mockResolvedValue({ replayed: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompletionRewardService,
        { provide: GamificationWalletService, useValue: walletService },
      ],
    }).compile();

    service = module.get(CompletionRewardService);
  });

  it('credits xp and points for a mission completion', async () => {
    const result = await service.awardCompletion({
      userId: 'u1',
      sourceType: RewardSourceType.MISSION,
      sourceId: 'm1',
      code: 'M.A1.1',
      reward: { id: 'r1', xp: 15, points: 20 },
    });

    expect(walletService.award).toHaveBeenCalledTimes(2);
    expect(walletService.award).toHaveBeenCalledWith({
      userId: 'u1',
      rewardId: 'r1',
      sourceType: RewardSourceType.MISSION,
      sourceId: 'm1',
      reason: 'Mission M.A1.1 completed',
      currency: WalletCurrency.XP,
      amount: 15,
    });
    expect(walletService.award).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: WalletCurrency.POINTS,
        amount: 20,
      }),
    );
    expect(result).toEqual({ xp: 15, points: 20 });
  });

  it('uses the challenge wording in the wallet entry reason', async () => {
    await service.awardCompletion({
      userId: 'u1',
      sourceType: RewardSourceType.CHALLENGE,
      sourceId: 'c1',
      code: 'CH.A1.1',
      reward: { id: 'r1', xp: 5, points: null },
    });

    expect(walletService.award).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'Challenge CH.A1.1 completed' }),
    );
  });

  it('skips currencies the reward does not grant', async () => {
    const result = await service.awardCompletion({
      userId: 'u1',
      sourceType: RewardSourceType.MISSION,
      sourceId: 'm1',
      code: 'M.A1.1',
      reward: { id: 'r1', xp: null, points: 20 },
    });

    expect(walletService.award).toHaveBeenCalledTimes(1);
    expect(walletService.award).toHaveBeenCalledWith(
      expect.objectContaining({ currency: WalletCurrency.POINTS }),
    );
    expect(result).toEqual({ xp: null, points: 20 });
  });

  it('returns null when no reward is attached', async () => {
    const result = await service.awardCompletion({
      userId: 'u1',
      sourceType: RewardSourceType.MISSION,
      sourceId: 'm1',
      code: 'M.A1.1',
      reward: null,
    });

    expect(walletService.award).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('swallows wallet failures so the caller is not failed', async () => {
    walletService.award.mockRejectedValue(new Error('wallet down'));

    const result = await service.awardCompletion({
      userId: 'u1',
      sourceType: RewardSourceType.MISSION,
      sourceId: 'm1',
      code: 'M.A1.1',
      reward: { id: 'r1', xp: 15, points: 20 },
    });

    expect(result).toBeNull();
  });
});
