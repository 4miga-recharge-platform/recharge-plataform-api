/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BigoService } from '../bigo.service';
import { BigoSignatureService } from '../http/bigo-signature.service';
import { BigoRetryService } from '../bigo-retry.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RechargePrecheckDto } from '../dto/recharge-precheck.dto';
import { DiamondRechargeDto } from '../dto/diamond-recharge.dto';
import { DisableRechargeDto } from '../dto/disable-recharge.dto';

// Mock env
jest.mock('../../env', () => ({
  env: {
    BIGO_HOST_DOMAIN: 'https://oauth.bigolive.tv',
    BIGO_HOST_BACKUP_DOMAIN: 'https://oauth.bigoapp.tv',
  },
}));

// Mock firstValueFrom
jest.mock('rxjs', () => ({
  firstValueFrom: jest.fn(),
  Subject: jest.fn(),
}));

describe('BigoService', () => {
  let service: BigoService;
  let httpService: any;
  let signatureService: any;
  let retryService: any;
  let prismaService: any;

  const mockRechargePrecheckDto: RechargePrecheckDto = {
    recharge_bigoid: '52900149',
  };

  const mockDiamondRechargeDto: DiamondRechargeDto = {
    recharge_bigoid: '52900149',
    bu_orderid: 'order_123456789',
    value: 712,
    total_cost: 711.9,
    currency: 'USD',
  };

  const mockDisableRechargeDto: DisableRechargeDto = {
    seqid: '83jyhm2784_089j',
  };

  const mockBigoResponse = {
    data: {
      rescode: 0,
      message: 'Success',
      recharge_balance: 1000,
    },
  };

  const mockBigoErrorResponse = {
    data: {
      rescode: 7212004,
      message: 'recharge_bigoid is not existed',
    },
  };

  beforeEach(async () => {
    const mockHttpService = {
      post: jest.fn(),
    };

    const mockSignatureService = {
      generateHeaders: jest.fn().mockResolvedValue({
        'bigo-client-id': 'test-client-id',
        'bigo-timestamp': '1234567890',
        'bigo-oauth-signature': 'test-signature',
      }),
    };

    const mockRetryService = {
      addToRetryQueue: jest.fn(),
      getRetryStats: jest.fn(),
    };

    const mockPrismaService = {
      bigoRecharge: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BigoService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: BigoSignatureService,
          useValue: mockSignatureService,
        },
        {
          provide: BigoRetryService,
          useValue: mockRetryService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BigoService>(BigoService);
    httpService = module.get(HttpService);
    signatureService = module.get(BigoSignatureService);
    retryService = module.get(BigoRetryService);
    prismaService = module.get(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rechargePrecheck', () => {
    it('should successfully perform recharge precheck', async () => {
      // Mock successful response
      (firstValueFrom as jest.Mock).mockResolvedValue(mockBigoResponse);

      // Mock log entry creation
      const generatedSeqid = 'precheck1234567890abc';
      prismaService.bigoRecharge.create.mockResolvedValue({
        id: 'log-123',
        seqid: generatedSeqid,
      });

      const result = await service.rechargePrecheck(mockRechargePrecheckDto);

      // Verify log entry was created with generated seqid
      expect(prismaService.bigoRecharge.create).toHaveBeenCalled();
      const createCall = prismaService.bigoRecharge.create.mock.calls[0][0];
      expect(createCall.data.seqid).toBeDefined();
      expect(createCall.data.endpoint).toBe('/sign/agent/recharge_pre_check');
      expect(createCall.data.status).toBe('SUCCESS');
      expect(createCall.data.requestBody.recharge_bigoid).toBe(mockRechargePrecheckDto.recharge_bigoid);
      expect(createCall.data.requestBody.seqid).toBeDefined();
      
      expect(result).toEqual(mockBigoResponse.data);
    });

    it('should handle API failure without adding to retry queue', async () => {

      // Mock API failure
      (firstValueFrom as jest.Mock).mockRejectedValue(
        new BadRequestException('Bigo API Error (7212012): request frequently'),
      );

      await expect(
        service.rechargePrecheck(mockRechargePrecheckDto),
      ).rejects.toThrow(BadRequestException);

      // Verify that no log entry was created (since it only creates on success)
      expect(prismaService.bigoRecharge.create).not.toHaveBeenCalled();

      // Verify that retry service was not called (since this method doesn't use it)
      expect(retryService.addToRetryQueue).not.toHaveBeenCalled();
    });
  });

  describe('diamondRecharge', () => {
    it('should successfully perform diamond recharge', async () => {
      // Mock successful response
      (firstValueFrom as jest.Mock).mockResolvedValue(mockBigoResponse);

      // Mock no existing order (bu_orderid check)
      prismaService.bigoRecharge.findFirst.mockResolvedValue(null);

      // Mock log entry creation
      const generatedSeqid = 'recharge1234567890abc';
      prismaService.bigoRecharge.create.mockResolvedValue({
        id: 'log-123',
        seqid: generatedSeqid,
        buOrderId: mockDiamondRechargeDto.bu_orderid,
      });

      // Mock log update
      prismaService.bigoRecharge.update.mockResolvedValue({});

      const result = await service.diamondRecharge(mockDiamondRechargeDto);

      // Verify bu_orderid check was performed
      expect(prismaService.bigoRecharge.findFirst).toHaveBeenCalledTimes(1);
      
      // Verify log entry was created with generated seqid
      expect(prismaService.bigoRecharge.create).toHaveBeenCalled();
      const createCall = prismaService.bigoRecharge.create.mock.calls[0][0];
      expect(createCall.data.seqid).toBeDefined();
      expect(createCall.data.buOrderId).toBe(mockDiamondRechargeDto.bu_orderid);
      
      expect(result).toEqual(mockBigoResponse.data);
    });

    it('should throw error if bu_orderid already exists', async () => {
      // Mock existing bu_orderid
      prismaService.bigoRecharge.findFirst.mockResolvedValue({
        id: 'existing-123',
        buOrderId: mockDiamondRechargeDto.bu_orderid,
      });

      await expect(
        service.diamondRecharge(mockDiamondRechargeDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('disableRecharge', () => {
    it('should successfully disable recharge', async () => {
      // Mock successful response
      (firstValueFrom as jest.Mock).mockResolvedValue(mockBigoResponse);

      // Mock log entry creation
      prismaService.bigoRecharge.create.mockResolvedValue({
        id: 'log-123',
        seqid: mockDisableRechargeDto.seqid,
      });

      // Mock log update
      prismaService.bigoRecharge.update.mockResolvedValue({});

      const result = await service.disableRecharge(mockDisableRechargeDto);

      expect(prismaService.bigoRecharge.create).toHaveBeenCalledWith({
        data: {
          seqid: mockDisableRechargeDto.seqid,
          endpoint: '/sign/agent/disable',
          status: 'REQUESTED',
          requestBody: mockDisableRechargeDto,
        },
      });
      expect(result).toEqual(mockBigoResponse.data);
    });
  });

  describe('getRechargeLogs', () => {
    it('should return recharge logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          seqid: 'seq-1',
          endpoint: '/sign/agent/recharge_pre_check',
          status: 'SUCCESS',
          createdAt: new Date(),
        },
      ];

      prismaService.bigoRecharge.findMany.mockResolvedValue(mockLogs);

      const result = await service.getRechargeLogs(5);

      expect(prismaService.bigoRecharge.findMany).toHaveBeenCalledWith({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          seqid: true,
          buOrderId: true,
          endpoint: true,
          status: true,
          rescode: true,
          message: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual({
        success: true,
        logs: mockLogs,
        total: 1,
      });
    });

    it('should handle errors gracefully', async () => {
      prismaService.bigoRecharge.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.getRechargeLogs(5);

      expect(result).toEqual({
        success: false,
        error: 'Database error',
        logs: [],
        total: 0,
      });
    });
  });

  describe('getRetryStats', () => {
    it('should return retry statistics', async () => {
      const mockStats = {
        stats: [{ status: 'RETRY_PENDING', _count: 2 }],
        pendingRetries: 2,
        maxRetries: 3,
        retryDelays: [3, 13, 28],
        retryableErrors: [],
        activeTimeouts: 0,
      };

      retryService.getRetryStats.mockResolvedValue(mockStats);

      const result = await service.getRetryStats();

      expect(retryService.getRetryStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('extractRescodeFromError', () => {
    it('should extract rescode from Bigo API error message', () => {
      const error = new BadRequestException(
        'Bigo API Error (7212012): request frequently',
      );

      // Access private method for testing
      const result = (service as any).extractRescodeFromError(error);

      expect(result).toBe(7212012);
    });

    it('should return default rescode for non-Bigo errors', () => {
      const error = new Error('Network timeout');

      const result = (service as any).extractRescodeFromError(error);

      expect(result).toBe(500001);
    });
  });

  describe('getBigoErrorMessage', () => {
    it('should return user-friendly error message for known rescode', () => {
      const result = (service as any).getBigoErrorMessage(
        7212004,
        'recharge_bigoid is not existed',
      );

      expect(result).toBe('Bigo API Error (7212004): Bigo user does not exist');
    });

    it('should return original message for unknown rescode', () => {
      const result = (service as any).getBigoErrorMessage(
        999999,
        'Unknown error',
      );

      expect(result).toBe('Bigo API Error (999999): Unknown error');
    });
  });
});
