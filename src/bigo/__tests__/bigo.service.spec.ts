import { Test, TestingModule } from '@nestjs/testing';
import { BigoService } from '../bigo.service';
import { BigoHttpService } from '../http/bigo-http.service';
import { PrismaService } from '../../prisma/prisma.service';
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

describe('BigoService', () => {
  let service: BigoService;
  let httpService: any;
  let prismaService: any;

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
    const mockHttpService = {
      post: jest.fn(),
    };

    const mockPrismaService = {
      bigoRecharge: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BigoService,
        {
          provide: BigoHttpService,
          useValue: mockHttpService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BigoService>(BigoService);
    httpService = module.get(BigoHttpService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSeqId', () => {
    it('should generate a unique seqid with correct format', () => {
      const seqid1 = (service as any).generateSeqId();
      const seqid2 = (service as any).generateSeqId();

      // Should be different each time
      expect(seqid1).not.toBe(seqid2);

      // Should be string
      expect(typeof seqid1).toBe('string');

      // Should have reasonable length (around 20 chars)
      expect(seqid1.length).toBeGreaterThan(15);
      expect(seqid1.length).toBeLessThan(25);

      // Should only contain alphanumeric characters
      expect(seqid1).toMatch(/^[0-9a-z]+$/);
    });
  });

  describe('precheck', () => {
    it('should call http service with correct parameters', async () => {
      const mockResponse = { success: true, seqid: 'test-seqid' };
      httpService.post.mockResolvedValue(mockResponse);

      const result = await service.precheck();

      expect(httpService.post).toHaveBeenCalledWith('/sign/agent/recharge_pre_check', {
        seqid: expect.any(String),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should generate unique seqid for each precheck call', async () => {
      const mockResponse = { success: true };
      httpService.post.mockResolvedValue(mockResponse);

      await service.precheck();
      await service.precheck();

      const call1 = httpService.post.mock.calls[0];
      const call2 = httpService.post.mock.calls[1];

      expect((call1[1] as any).seqid).not.toBe((call2[1] as any).seqid);
    });
  });

  describe('recharge', () => {
    it('should call http service with correct parameters including seqid', async () => {
      const mockResponse = { success: true, seqid: 'test-seqid' };
      httpService.post.mockResolvedValue(mockResponse);

      const result = await service.recharge(mockRechargeDto);

      expect(httpService.post).toHaveBeenCalledWith('/sign/agent/rs_recharge', {
        ...mockRechargeDto,
        seqid: expect.any(String),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should generate unique seqid for each recharge call', async () => {
      const mockResponse = { success: true };
      httpService.post.mockResolvedValue(mockResponse);

      await service.recharge(mockRechargeDto);
      await service.recharge(mockRechargeDto);

      const call1 = httpService.post.mock.calls[0];
      const call2 = httpService.post.mock.calls[1];

      expect((call1[1] as any).seqid).not.toBe((call2[1] as any).seqid);
    });

    it('should preserve all original payload properties', async () => {
      const mockResponse = { success: true };
      httpService.post.mockResolvedValue(mockResponse);

      await service.recharge(mockRechargeDto);

      const call = httpService.post.mock.calls[0];
      const payload = call[1] as any;

      expect(payload.recharge_bigoid).toBe(mockRechargeDto.recharge_bigoid);
      expect(payload.bu_orderid).toBe(mockRechargeDto.bu_orderid);
      expect(payload.value).toBe(mockRechargeDto.value);
      expect(payload.total_cost).toBe(mockRechargeDto.total_cost);
      expect(payload.currency).toBe(mockRechargeDto.currency);
      expect(payload.seqid).toBeDefined();
    });
  });

  describe('disable', () => {
    it('should call http service with correct parameters', async () => {
      const mockResponse = { success: true, seqid: 'test-seqid' };
      httpService.post.mockResolvedValue(mockResponse);

      const result = await service.disable();

      expect(httpService.post).toHaveBeenCalledWith('/sign/agent/disable', {
        seqid: expect.any(String),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should generate unique seqid for each disable call', async () => {
      const mockResponse = { success: true };
      httpService.post.mockResolvedValue(mockResponse);

      await service.disable();
      await service.disable();

      const call1 = httpService.post.mock.calls[0];
      const call2 = httpService.post.mock.calls[1];

      expect((call1[1] as any).seqid).not.toBe((call2[1] as any).seqid);
    });
  });

  describe('findAll', () => {
    it('should return all bigo recharge records with order information', async () => {
      const mockRecharges = [mockBigoRecharge];
      (prismaService.bigoRecharge.findMany as jest.Mock).mockResolvedValue(mockRecharges);

      const result = await service.findAll();

      expect(prismaService.bigoRecharge.findMany).toHaveBeenCalledWith({
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              orderStatus: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(mockRecharges);
    });

    it('should return empty array when no records exist', async () => {
      (prismaService.bigoRecharge.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });
});
