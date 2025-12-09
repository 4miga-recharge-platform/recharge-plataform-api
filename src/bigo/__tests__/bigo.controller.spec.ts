import { Test, TestingModule } from '@nestjs/testing';
import { BigoController } from '../bigo.controller';
import { BigoService } from '../bigo.service';

// Mock env to prevent DATABASE_URL issues
jest.mock('../../env', () => ({
  env: {
    BIGO_HOST_DOMAIN: 'https://oauth.bigolive.tv',
    BIGO_HOST_BACKUP_DOMAIN: 'https://backup.bigolive.tv',
    BIGO_CLIENT_ID: 'test-client-id',
    BIGO_PRIVATE_KEY: 'test-private-key',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  },
}));
import { RechargePrecheckDto } from '../dto/recharge-precheck.dto';
import { DiamondRechargeDto } from '../dto/diamond-recharge.dto';
import { DisableRechargeDto } from '../dto/disable-recharge.dto';

describe('BigoController', () => {
  let controller: BigoController;
  let bigoService: any;

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

  const mockPrecheckResponse = {
    rescode: 0,
    message: 'Success',
    recharge_balance: 1000,
  };

  const mockRechargeResponse = {
    rescode: 0,
    message: 'Recharge successful',
  };

  const mockDisableResponse = {
    rescode: 0,
    message: 'Recharge disabled',
  };

  const mockLogsResponse = {
    success: true,
    logs: [
      {
        id: 'log-1',
        seqid: 'seq-1',
        endpoint: '/sign/agent/recharge_pre_check',
        status: 'SUCCESS',
        createdAt: new Date(),
      },
    ],
    total: 1,
  };

  const mockRetryStatsResponse = {
    stats: [{ status: 'RETRY_PENDING', _count: 2 }],
    pendingRetries: 2,
    maxRetries: 3,
    retryDelays: [3, 13, 28],
    retryableErrors: [],
    activeTimeouts: 0,
  };

  beforeEach(async () => {
    const mockBigoService = {
      rechargePrecheck: jest.fn(),
      diamondRecharge: jest.fn(),
      disableRecharge: jest.fn(),
      getRechargeLogs: jest.fn(),
      getRetryStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BigoController],
      providers: [
        {
          provide: BigoService,
          useValue: mockBigoService,
        },
      ],
    }).compile();

    controller = module.get<BigoController>(BigoController);
    bigoService = module.get(BigoService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rechargePrecheck', () => {
    it('should successfully perform recharge precheck', async () => {
      bigoService.rechargePrecheck.mockResolvedValue(mockPrecheckResponse);

      const result = await controller.rechargePrecheck(mockRechargePrecheckDto);

      expect(bigoService.rechargePrecheck).toHaveBeenCalledWith(
        mockRechargePrecheckDto,
      );
      expect(result).toEqual(mockPrecheckResponse);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      bigoService.rechargePrecheck.mockRejectedValue(error);

      await expect(
        controller.rechargePrecheck(mockRechargePrecheckDto),
      ).rejects.toThrow(error);

      expect(bigoService.rechargePrecheck).toHaveBeenCalledWith(
        mockRechargePrecheckDto,
      );
    });
  });

  describe('diamondRecharge', () => {
    it('should successfully perform diamond recharge', async () => {
      bigoService.diamondRecharge.mockResolvedValue(mockRechargeResponse);

      const result = await controller.diamondRecharge(mockDiamondRechargeDto);

      expect(bigoService.diamondRecharge).toHaveBeenCalledWith(
        mockDiamondRechargeDto,
      );
      expect(result).toEqual(mockRechargeResponse);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      bigoService.diamondRecharge.mockRejectedValue(error);

      await expect(
        controller.diamondRecharge(mockDiamondRechargeDto),
      ).rejects.toThrow(error);

      expect(bigoService.diamondRecharge).toHaveBeenCalledWith(
        mockDiamondRechargeDto,
      );
    });
  });

  describe('disableRecharge', () => {
    it('should successfully disable recharge', async () => {
      bigoService.disableRecharge.mockResolvedValue(mockDisableResponse);

      const result = await controller.disableRecharge(mockDisableRechargeDto);

      expect(bigoService.disableRecharge).toHaveBeenCalledWith(
        mockDisableRechargeDto,
      );
      expect(result).toEqual(mockDisableResponse);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      bigoService.disableRecharge.mockRejectedValue(error);

      await expect(
        controller.disableRecharge(mockDisableRechargeDto),
      ).rejects.toThrow(error);

      expect(bigoService.disableRecharge).toHaveBeenCalledWith(
        mockDisableRechargeDto,
      );
    });
  });

  describe('getLogs', () => {
    it('should return recharge logs with default limit', async () => {
      bigoService.getRechargeLogs.mockResolvedValue(mockLogsResponse);

      const result = await controller.getLogs();

      expect(bigoService.getRechargeLogs).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockLogsResponse);
    });

    it('should return recharge logs with custom limit', async () => {
      bigoService.getRechargeLogs.mockResolvedValue(mockLogsResponse);

      const result = await controller.getLogs(25);

      expect(bigoService.getRechargeLogs).toHaveBeenCalledWith(25);
      expect(result).toEqual(mockLogsResponse);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      bigoService.getRechargeLogs.mockRejectedValue(error);

      await expect(controller.getLogs(10)).rejects.toThrow(error);

      expect(bigoService.getRechargeLogs).toHaveBeenCalledWith(10);
    });
  });

  describe('getRetryStats', () => {
    it('should return retry statistics', async () => {
      bigoService.getRetryStats.mockResolvedValue(mockRetryStatsResponse);

      const result = await controller.getRetryStats();

      expect(bigoService.getRetryStats).toHaveBeenCalled();
      expect(result).toEqual(mockRetryStatsResponse);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      bigoService.getRetryStats.mockRejectedValue(error);

      await expect(controller.getRetryStats()).rejects.toThrow(error);

      expect(bigoService.getRetryStats).toHaveBeenCalled();
    });
  });
});
