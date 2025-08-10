import { Test, TestingModule } from '@nestjs/testing';
import { BigoController } from '../bigo.controller';
import { BigoService } from '../bigo.service';
import { RechargeDto } from '../dto/recharge.dto';

// Mock env module to avoid environment variable issues during testing
jest.mock('../../env', () => ({
  env: {
    BIGO_HOST_DOMAIN: 'test.bigo.com',
    BIGO_CLIENT_ID: 'test-client-id',
    BIGO_CLIENT_SECRET: 'test-client-secret',
    BIGO_RESELLER_BIGOID: 'test-reseller-id',
    BIGO_ENABLED: true,
  },
}));

describe('BigoController', () => {
  let controller: BigoController;
  let bigoService: any;

  const mockRechargeDto: RechargeDto = {
    recharge_bigoid: '52900149',
    bu_orderid: 'ORDER_ABC_123',
    value: 712,
    total_cost: 711.9,
    currency: 'USD' as any,
  };

  const mockBigoRecharge = {
    id: 'bigo-recharge-123',
    rechargeBigoid: '52900149',
    buOrderid: 'ORDER_ABC_123',
    value: 712,
    totalCost: 711.9,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
    order: {
      id: 'order-123',
      orderNumber: 'ORD-001',
      orderStatus: 'PENDING',
    },
  };

  beforeEach(async () => {
    const mockBigoService = {
      findAll: jest.fn(),
      precheck: jest.fn(),
      recharge: jest.fn(),
      disable: jest.fn(),
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

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all BIGO recharge records', async () => {
      const mockRecharges = [mockBigoRecharge];
      bigoService.findAll.mockResolvedValue(mockRecharges);

      const result = await controller.findAll();

      expect(bigoService.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(mockRecharges);
    });

    it('should return empty array when no records exist', async () => {
      bigoService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Database connection failed');
      bigoService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow('Database connection failed');
    });
  });

  describe('precheck', () => {
    it('should call precheck service and return result', async () => {
      const mockResponse = { success: true, seqid: 'test-seqid' };
      bigoService.precheck.mockResolvedValue(mockResponse);

      const result = await controller.precheck();

      expect(bigoService.precheck).toHaveBeenCalledWith();
      expect(result).toEqual(mockResponse);
    });

    it('should handle precheck service errors', async () => {
      const error = new Error('BIGO service unavailable');
      bigoService.precheck.mockRejectedValue(error);

      await expect(controller.precheck()).rejects.toThrow('BIGO service unavailable');
    });
  });

  describe('recharge', () => {
    it('should call recharge service with correct payload', async () => {
      const mockResponse = { success: true, seqid: 'test-seqid' };
      bigoService.recharge.mockResolvedValue(mockResponse);

      const result = await controller.recharge(mockRechargeDto);

      expect(bigoService.recharge).toHaveBeenCalledWith(mockRechargeDto);
      expect(result).toEqual(mockResponse);
    });

    it('should handle recharge service errors', async () => {
      const error = new Error('Invalid BIGO ID');
      bigoService.recharge.mockRejectedValue(error);

      await expect(controller.recharge(mockRechargeDto)).rejects.toThrow('Invalid BIGO ID');
    });

    it('should pass through the complete DTO payload', async () => {
      const mockResponse = { success: true };
      bigoService.recharge.mockResolvedValue(mockResponse);

      await controller.recharge(mockRechargeDto);

      expect(bigoService.recharge).toHaveBeenCalledWith(mockRechargeDto);
    });
  });

  describe('disable', () => {
    it('should call disable service and return result', async () => {
      const mockResponse = { success: true, message: 'APIs disabled' };
      bigoService.disable.mockResolvedValue(mockResponse);

      const result = await controller.disable();

      expect(bigoService.disable).toHaveBeenCalledWith();
      expect(result).toEqual(mockResponse);
    });

    it('should handle disable service errors', async () => {
      const error = new Error('Failed to disable APIs');
      bigoService.disable.mockRejectedValue(error);

      await expect(controller.disable()).rejects.toThrow('Failed to disable APIs');
    });
  });
});
