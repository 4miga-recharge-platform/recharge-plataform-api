import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { BigoRetryService } from '../bigo-retry.service';
import { BigoService } from '../bigo.service';
import { Cron } from '@nestjs/schedule';

// Remove Logger mock completely - let NestJS use the default Logger

// Mock setTimeout and clearTimeout
const mockSetTimeout = jest.fn();
const mockClearTimeout = jest.fn();

global.setTimeout = mockSetTimeout as any;
global.clearTimeout = mockClearTimeout as any;

describe('BigoRetryService', () => {
  let service: BigoRetryService;
  let bigoService: any;
  let prismaService: any;

  const mockRecharge = {
    id: 'recharge-123',
    seqid: '83jyhm2784_089j',
    endpoint: '/sign/agent/rs_recharge',
    status: 'RETRY_PENDING',
    requestBody: {
      recharge_bigoid: '52900149',
      seqid: '83jyhm2784_089j',
      bu_orderid: 'order_123',
      value: 712,
      total_cost: 711.9,
      currency: 'USD',
    },
    attempts: 1,
    rescode: 7212012,
    message: 'Rate limit exceeded',
  };

  beforeEach(async () => {
    const mockBigoService = {
      rechargePrecheck: jest.fn(),
      diamondRecharge: jest.fn(),
      disableRecharge: jest.fn(),
    };

    const mockPrismaService = {
      bigoRecharge: {
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BigoRetryService,
        {
          provide: BigoService,
          useValue: mockBigoService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BigoRetryService>(BigoRetryService);
    bigoService = module.get(BigoService);
    prismaService = module.get(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Reset setTimeout mock
    mockSetTimeout.mockImplementation(() => {
      const timeoutId = Math.random().toString();
      return timeoutId;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToRetryQueue', () => {
    it('should add retryable error to queue', async () => {
      const rechargeId = 'recharge-123';
      const rescode = 7212012; // Rate limit - retryable
      const errorMessage = 'Rate limit exceeded';

      prismaService.bigoRecharge.findUnique.mockResolvedValue({
        id: rechargeId,
        seqid: 'test-seqid',
        status: 'REQUESTED',
      });
      prismaService.bigoRecharge.update.mockResolvedValue({});

      await service.addToRetryQueue(rechargeId, rescode, errorMessage);

      expect(prismaService.bigoRecharge.update).toHaveBeenCalledWith({
        where: { id: rechargeId },
        data: {
          status: 'RETRY_PENDING',
          nextRetry: expect.any(Date),
          attempts: 1,
          rescode,
          message: errorMessage,
        },
      });

      expect(mockSetTimeout).toHaveBeenCalled();
    });

    it('should not retry non-retryable errors', async () => {
      const rechargeId = 'recharge-123';
      const rescode = 7212004; // User not exists - not retryable
      const errorMessage = 'User not exists';

      prismaService.bigoRecharge.update.mockResolvedValue({});

      await service.addToRetryQueue(rechargeId, rescode, errorMessage);

      expect(prismaService.bigoRecharge.update).toHaveBeenCalledWith({
        where: { id: rechargeId },
        data: {
          status: 'FAILED',
          message: `Error ${rescode} is not retryable`,
          nextRetry: null,
        },
      });

      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it('should stop retrying after max attempts', async () => {
      const rechargeId = 'recharge-123';
      const rescode = 7212012; // Rate limit - retryable
      const errorMessage = 'Rate limit exceeded';

      prismaService.bigoRecharge.update.mockResolvedValue({});

      // Try to add retry for attempt 4 (beyond max of 3)
      await service.addToRetryQueue(rechargeId, rescode, errorMessage, 4);

      expect(prismaService.bigoRecharge.update).toHaveBeenCalledWith({
        where: { id: rechargeId },
        data: {
          status: 'FAILED',
          message: `Max retries (3) exceeded for error ${rescode}`,
          nextRetry: null,
        },
      });

      expect(mockSetTimeout).not.toHaveBeenCalled();
    });
  });

  describe('processSpecificRetry', () => {
    it('should process retry successfully', async () => {
      const rechargeId = 'recharge-123';
      const attemptNumber = 1;

      prismaService.bigoRecharge.findUnique.mockResolvedValue(mockRecharge);
      prismaService.bigoRecharge.update
        .mockResolvedValueOnce({}) // Mark as REQUESTED
        .mockResolvedValueOnce({}); // Mark as SUCCESS

      bigoService.diamondRecharge.mockResolvedValue({ success: true });

      // Access private method for testing
      await (service as any).processSpecificRetry(rechargeId, attemptNumber);

      expect(prismaService.bigoRecharge.update).toHaveBeenCalledTimes(2);
      expect(bigoService.diamondRecharge).toHaveBeenCalled();
    });

    it('should handle retry failure and schedule next attempt', async () => {
      const rechargeId = 'recharge-123';
      const attemptNumber = 1;

      prismaService.bigoRecharge.findUnique.mockResolvedValue(mockRecharge);
      prismaService.bigoRecharge.update.mockResolvedValue({});

      bigoService.diamondRecharge.mockRejectedValue(
        new Error('Bigo API Error (7212012): request frequently'),
      );

      // Mock addToRetryQueue
      jest.spyOn(service, 'addToRetryQueue').mockResolvedValue();

      // Access private method for testing
      await (service as any).processSpecificRetry(rechargeId, attemptNumber);

      expect(service.addToRetryQueue).toHaveBeenCalledWith(
        rechargeId,
        7212012,
        'Bigo API Error (7212012): request frequently',
        2,
      );
    });

    it('should not process if recharge not found', async () => {
      const rechargeId = 'recharge-123';
      const attemptNumber = 1;

      prismaService.bigoRecharge.findUnique.mockResolvedValue(null);

      // Access private method for testing
      await (service as any).processSpecificRetry(rechargeId, attemptNumber);

      expect(prismaService.bigoRecharge.update).not.toHaveBeenCalled();
      expect(bigoService.diamondRecharge).not.toHaveBeenCalled();
    });
  });

  // describe('processStuckRetries', () => {
  //   it('should process stuck retries', async () => {
  //     const stuckRetries = [mockRecharge];
  //
  //     prismaService.bigoRecharge.findMany.mockResolvedValue(stuckRetries);
  //
  //     await service.processStuckRetries();
  //
  //     expect(prismaService.bigoRecharge.findMany).toHaveBeenCalledWith({
  //       where: {
  //         status: 'RETRY_PENDING',
  //         nextRetry: { lt: expect.any(Date) },
  //         attempts: { lt: 3 },
  //       },
  //     });
  //
  //     expect(mockSetTimeout).toHaveBeenCalled();
  //   });
  //
  //   it('should handle no stuck retries', async () => {
  //     prismaService.bigoRecharge.findMany.mockResolvedValue([]);
  //
  //     await service.processStuckRetries();
  //
  //     expect(mockSetTimeout).not.toHaveBeenCalled();
  //   });
  //
  //   it('should handle errors gracefully', async () => {
  //     prismaService.bigoRecharge.findMany.mockRejectedValue(
  //       new Error('Database error'),
  //     );
  //
  //     await service.processStuckRetries();
  //
  //     expect(mockSetTimeout).not.toHaveBeenCalled();
  //   });
  // });

  describe('getRetryStats', () => {
    it('should return retry statistics', async () => {
      const mockStats = [
        { status: 'SUCCESS', _count: 5 },
        { status: 'FAILED', _count: 2 },
      ];

      const mockRetryableErrors = [
        { rescode: 7212012, _count: 3 },
        { rescode: 500001, _count: 1 },
      ];

      prismaService.bigoRecharge.groupBy
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockRetryableErrors);

      prismaService.bigoRecharge.count.mockResolvedValue(2);

      const result = await service.getRetryStats();

      expect(result).toEqual({
        stats: mockStats,
        pendingRetries: 2,
        maxRetries: 3,
        retryDelays: [3, 13, 28],
        retryableErrors: mockRetryableErrors,
        activeTimeouts: 0,
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear all timeouts', () => {
      // Add some timeouts to the service
      (service as any).retryTimeouts.set('recharge-1', 'timeout-1');
      (service as any).retryTimeouts.set('recharge-2', 'timeout-2');

      service.onModuleDestroy();

      expect(mockClearTimeout).toHaveBeenCalledTimes(2);
      expect((service as any).retryTimeouts.size).toBe(0);
    });
  });

  describe('shouldRetry', () => {
    it('should return true for retryable errors', () => {
      expect((service as any).shouldRetry(7212012)).toBe(true); // Rate limit
      expect((service as any).shouldRetry(500001)).toBe(true); // Internal error
    });

    it('should return false for non-retryable errors', () => {
      expect((service as any).shouldRetry(7212004)).toBe(false); // User not exists
      expect((service as any).shouldRetry(7212005)).toBe(false); // User cannot be recharged
      expect((service as any).shouldRetry(999999)).toBe(false); // Unknown error
    });
  });

  describe('getRetryDelay', () => {
    it('should return progressive delays for rate limit errors', () => {
      expect((service as any).getRetryDelay(7212012, 1)).toBe(30); // 30s
      expect((service as any).getRetryDelay(7212012, 2)).toBe(60); // 60s
      expect((service as any).getRetryDelay(7212012, 3)).toBe(90); // 90s
      expect((service as any).getRetryDelay(7212012, 4)).toBe(120); // 120s (max)
    });

    it('should return standard delays for other errors', () => {
      expect((service as any).getRetryDelay(500001, 1)).toBe(3); // 3min
      expect((service as any).getRetryDelay(500001, 2)).toBe(13); // 13min
      expect((service as any).getRetryDelay(500001, 3)).toBe(28); // 28min
      expect((service as any).getRetryDelay(500001, 4)).toBe(30); // 30min (default)
    });
  });
});
