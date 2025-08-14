import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CouponService } from '../coupon.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCouponDto } from '../dto/create-coupon.dto';
import { UpdateCouponDto } from '../dto/update-coupon.dto';

// Mock validateRequiredFields utility
jest.mock('src/utils/validation.util', () => ({
  validateRequiredFields: jest.fn(),
}));

describe('CouponService', () => {
  let service: CouponService;
  let prismaService: any;

  const mockStore = {
    id: 'store-123',
    name: 'Test Store',
    description: 'Test store description',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInfluencer = {
    id: 'influencer-123',
    name: 'Test Influencer',
    email: 'test@example.com',
    phone: '11999999999',
    paymentMethod: 'pix',
    paymentData: 'PIX_KEY',
    isActive: true,
    storeId: 'store-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCoupon = {
    id: 'coupon-123',
    title: 'WELCOME10',
    influencerId: 'influencer-123',
    discountPercentage: 10.00,
    discountAmount: null,
    expiresAt: new Date('2025-12-31'),
    timesUsed: 5,
    totalSalesAmount: 150.00,
    maxUses: 100,
    minOrderAmount: 20.00,
    isActive: true,
    isFirstPurchase: true,
    storeId: 'store-123',
  };

  const mockExpiredCoupon = {
    ...mockCoupon,
    expiresAt: new Date('2020-12-31'),
  };

  const mockMaxUsesCoupon = {
    ...mockCoupon,
    maxUses: 5,
    timesUsed: 5,
  };

  const mockMinOrderCoupon = {
    ...mockCoupon,
    minOrderAmount: 30.00,
  };

  const mockInactiveCoupon = {
    ...mockCoupon,
    isActive: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        {
          provide: PrismaService,
          useValue: {
            coupon: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            store: {
              findUnique: jest.fn(),
            },
            influencer: {
              findFirst: jest.fn(),
            },
            couponUsage: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all coupons', async () => {
      const mockCoupons = [mockCoupon];
      prismaService.coupon.findMany.mockResolvedValue(mockCoupons);

      const result = await service.findAll();

      expect(result).toEqual(mockCoupons);
      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        select: expect.any(Object),
      });
    });

    it('should throw BadRequestException when prisma fails', async () => {
      prismaService.coupon.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll()).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a coupon by id', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.findOne('coupon-123');

      expect(result).toEqual(mockCoupon);
      expect(prismaService.coupon.findUnique).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        select: expect.any(Object),
      });
    });

    it('should throw BadRequestException when coupon not found', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByStore', () => {
    it('should return coupons by store id', async () => {
      const mockCoupons = [mockCoupon];
      prismaService.coupon.findMany.mockResolvedValue(mockCoupons);

      const result = await service.findByStore('store-123');

      expect(result).toEqual(mockCoupons);
      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-123' },
        select: expect.any(Object),
      });
    });
  });

  describe('findByInfluencer', () => {
    it('should return coupons by influencer id', async () => {
      const mockCoupons = [mockCoupon];
      prismaService.coupon.findMany.mockResolvedValue(mockCoupons);

      const result = await service.findByInfluencer('influencer-123');

      expect(result).toEqual(mockCoupons);
      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: { influencerId: 'influencer-123' },
        select: expect.any(Object),
      });
    });
  });

  describe('findActiveByStore', () => {
    it('should return active coupons by store id', async () => {
      const mockCoupons = [mockCoupon];
      prismaService.coupon.findMany.mockResolvedValue(mockCoupons);

      const result = await service.findActiveByStore('store-123');

      expect(result).toEqual(mockCoupons);
      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        },
        select: expect.any(Object),
      });
    });
  });

  describe('findFirstPurchaseByStore', () => {
    it('should return first purchase coupons by store id', async () => {
      const mockCoupons = [mockCoupon];
      prismaService.coupon.findMany.mockResolvedValue(mockCoupons);

      const result = await service.findFirstPurchaseByStore('store-123');

      expect(result).toEqual(mockCoupons);
      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          isFirstPurchase: true,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        },
        select: expect.any(Object),
      });
    });
  });

  describe('create', () => {
    const createCouponDto: CreateCouponDto = {
      title: 'WELCOME10',
      influencerId: 'influencer-123',
      discountPercentage: 10.00,
      discountAmount: null,
      expiresAt: '2025-12-31T23:59:59.000Z',
      maxUses: 100,
      minOrderAmount: 20.00,
      isActive: true,
      isFirstPurchase: true,
      storeId: 'store-123',
    };

    it('should create a coupon successfully', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findFirst.mockResolvedValue(null);
      prismaService.coupon.create.mockResolvedValue(mockCoupon);

      const result = await service.create(createCouponDto);

      expect(result).toEqual(mockCoupon);
      expect(prismaService.coupon.create).toHaveBeenCalledWith({
        data: {
          ...createCouponDto,
          expiresAt: createCouponDto.expiresAt ? new Date(createCouponDto.expiresAt) : undefined,
        },
        select: expect.any(Object),
      });
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.create(createCouponDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when influencer not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(null);

      await expect(service.create(createCouponDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when coupon title already exists', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findFirst.mockResolvedValue(mockCoupon);

      await expect(service.create(createCouponDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when both discount percentage and amount are provided', async () => {
      const invalidDto = { ...createCouponDto, discountAmount: 5.00 };
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findFirst.mockResolvedValue(null);

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when neither discount percentage nor amount is provided', async () => {
      const invalidDto = { ...createCouponDto, discountPercentage: null, discountAmount: null };
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findFirst.mockResolvedValue(null);

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    const updateCouponDto: UpdateCouponDto = {
      title: 'UPDATED10',
      discountPercentage: 15.00,
    };

    it('should update a coupon successfully', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockCoupon);
      prismaService.coupon.update.mockResolvedValue({ ...mockCoupon, ...updateCouponDto });

      const result = await service.update('coupon-123', updateCouponDto);

      expect(result).toEqual({ ...mockCoupon, ...updateCouponDto });
      expect(prismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        data: updateCouponDto,
        select: expect.any(Object),
      });
    });

    it('should throw BadRequestException when coupon not found', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateCouponDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a coupon successfully', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockCoupon);
      prismaService.couponUsage.findMany.mockResolvedValue([]);
      prismaService.coupon.delete.mockResolvedValue(mockCoupon);

      const result = await service.remove('coupon-123');

      expect(result).toEqual(mockCoupon);
      expect(prismaService.coupon.delete).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        select: expect.any(Object),
      });
    });

    it('should throw BadRequestException when coupon has associated usages', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockCoupon);
      prismaService.couponUsage.findMany.mockResolvedValue([{ id: 'usage-1' }]);

      await expect(service.remove('coupon-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateCoupon', () => {
    it('should return valid when coupon is valid', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.validateCoupon('coupon-123', 25.00);

      expect(result).toEqual({ valid: true });
    });

    it('should return invalid when coupon is not active', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockInactiveCoupon);

      const result = await service.validateCoupon('coupon-123', 25.00);

      expect(result).toEqual({ valid: false, message: 'Coupon is not active' });
    });

    it('should return invalid when coupon has expired', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockExpiredCoupon);

      const result = await service.validateCoupon('coupon-123', 25.00);

      expect(result).toEqual({ valid: false, message: 'Coupon has expired' });
    });

    it('should return invalid when usage limit reached', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockMaxUsesCoupon);

      const result = await service.validateCoupon('coupon-123', 25.00);

      expect(result).toEqual({ valid: false, message: 'Coupon usage limit reached' });
    });

    it('should return invalid when order amount is below minimum', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockMinOrderCoupon);

      const result = await service.validateCoupon('coupon-123', 25.00);

      expect(result).toEqual({ valid: false, message: 'Minimum order amount required: 30' });
    });

    it('should return invalid when coupon not found', async () => {
      prismaService.coupon.findUnique.mockRejectedValue(new Error('Not found'));

      const result = await service.validateCoupon('invalid-id', 25.00);

      expect(result).toEqual({ valid: false, message: 'Invalid coupon' });
    });
  });

  describe('applyCoupon', () => {
    it('should apply percentage discount successfully', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.applyCoupon('coupon-123', 100.00);

      expect(result).toEqual({
        discountAmount: 10.00,
        finalAmount: 90.00,
      });
    });

    it('should apply amount discount successfully', async () => {
      const amountCoupon = { ...mockCoupon, discountPercentage: null, discountAmount: 5.00 };
      prismaService.coupon.findUnique.mockResolvedValue(amountCoupon);

      const result = await service.applyCoupon('coupon-123', 100.00);

      expect(result).toEqual({
        discountAmount: 5.00,
        finalAmount: 95.00,
      });
    });

    it('should limit discount amount to order amount', async () => {
      const amountCoupon = { ...mockCoupon, discountPercentage: null, discountAmount: 150.00 };
      prismaService.coupon.findUnique.mockResolvedValue(amountCoupon);

      const result = await service.applyCoupon('coupon-123', 100.00);

      expect(result).toEqual({
        discountAmount: 100.00,
        finalAmount: 0,
      });
    });

    it('should throw BadRequestException when coupon validation fails', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockExpiredCoupon);

      await expect(service.applyCoupon('coupon-123', 100.00)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
