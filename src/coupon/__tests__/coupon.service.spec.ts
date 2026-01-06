import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CouponService } from '../coupon.service';
import { CreateCouponDto } from '../dto/create-coupon.dto';
import { UpdateCouponDto } from '../dto/update-coupon.dto';

// Mock validation utility
jest.mock('../../utils/validation.util', () => ({
  validateRequiredFields: jest.fn(),
}));

describe('CouponService', () => {
  let service: CouponService;
  let prismaService: any;

  const mockCoupon = {
    id: 'coupon-123',
    title: 'Desconto 10%',
    discountPercentage: 10,
    discountAmount: null,
    expiresAt: new Date('2025-12-31'), // Future date to avoid expiration
    timesUsed: 5,
    totalSalesAmount: 1000,
    maxUses: 100,
    minOrderAmount: 50,
    isActive: true,
    isFirstPurchase: false,
    isOneTimePerBigoId: false,
    storeId: 'store-123',
    influencerId: 'influencer-123',
    influencer: {
      id: 'influencer-123',
      name: 'João Silva',
      email: 'joao@exemplo.com',
    },
  };

  const mockStore = {
    id: 'store-123',
    name: 'Loja Exemplo',
    email: 'loja@exemplo.com',
  };

  const mockInfluencer = {
    id: 'influencer-123',
    name: 'João Silva',
    email: 'joao@exemplo.com',
    storeId: 'store-123',
  };

  const mockCouponSelect = {
    id: true,
    title: true,
    influencerId: true,
    discountPercentage: true,
    discountAmount: true,
    expiresAt: true,
    timesUsed: true,
    totalSalesAmount: true,
    maxUses: true,
    minOrderAmount: true,
    isActive: true,
    isFirstPurchase: true,
    storeId: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      coupon: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
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
      featuredCoupon: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
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
        where: { deletedAt: null },
        select: expect.any(Object),
      });
    });

    it('should throw BadRequestException when prisma fails', async () => {
      prismaService.coupon.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAll()).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a coupon by id with influencer data', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.findOne('coupon-123');

      expect(result).toEqual(mockCoupon);
      expect(prismaService.coupon.findUnique).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        select: {
          ...mockCouponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
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
    it('should return coupons by store with pagination successfully', async () => {
      const coupons = [mockCoupon];
      const totalCoupons = 1;

      prismaService.coupon.findMany.mockResolvedValue(coupons);
      prismaService.coupon.count.mockResolvedValue(totalCoupons);

      const result = await service.findByStore('store-123');

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-123', deletedAt: null },
        select: {
          ...mockCouponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(prismaService.coupon.count).toHaveBeenCalledWith({
        where: { storeId: 'store-123', deletedAt: null },
      });
      expect(result).toEqual({
        data: coupons,
        totalCoupons,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return coupons by store with custom pagination parameters', async () => {
      const coupons = [mockCoupon];
      const totalCoupons = 15;

      prismaService.coupon.findMany.mockResolvedValue(coupons);
      prismaService.coupon.count.mockResolvedValue(totalCoupons);

      const result = await service.findByStore('store-123', 2, 5);

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-123', deletedAt: null },
        select: {
          ...mockCouponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 5,
        take: 5,
      });
      expect(prismaService.coupon.count).toHaveBeenCalledWith({
        where: { storeId: 'store-123', deletedAt: null },
      });
      expect(result).toEqual({
        data: coupons,
        totalCoupons,
        page: 2,
        totalPages: 3,
      });
    });

    it('should return coupons with search filter by title', async () => {
      const coupons = [mockCoupon];
      const totalCoupons = 1;

      prismaService.coupon.findMany.mockResolvedValue(coupons);
      prismaService.coupon.count.mockResolvedValue(totalCoupons);

      const result = await service.findByStore('store-123', 1, 10, 'desconto');

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          deletedAt: null,
          OR: [
            { title: { contains: 'desconto', mode: 'insensitive' } },
            {
              influencer: {
                name: { contains: 'desconto', mode: 'insensitive' },
              },
            },
          ],
        },
        select: {
          ...mockCouponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(prismaService.coupon.count).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          deletedAt: null,
          OR: [
            { title: { contains: 'desconto', mode: 'insensitive' } },
            {
              influencer: {
                name: { contains: 'desconto', mode: 'insensitive' },
              },
            },
          ],
        },
      });
      expect(result).toEqual({
        data: coupons,
        totalCoupons,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return coupons with search filter by influencer name', async () => {
      const coupons = [mockCoupon];
      const totalCoupons = 1;

      prismaService.coupon.findMany.mockResolvedValue(coupons);
      prismaService.coupon.count.mockResolvedValue(totalCoupons);

      const result = await service.findByStore('store-123', 1, 10, 'joão');

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          deletedAt: null,
          OR: [
            { title: { contains: 'joão', mode: 'insensitive' } },
            { influencer: { name: { contains: 'joão', mode: 'insensitive' } } },
          ],
        },
        select: {
          ...mockCouponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: coupons,
        totalCoupons,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return coupons with percentage type filter', async () => {
      const coupons = [mockCoupon];
      const totalCoupons = 1;

      prismaService.coupon.findMany.mockResolvedValue(coupons);
      prismaService.coupon.count.mockResolvedValue(totalCoupons);

      const result = await service.findByStore(
        'store-123',
        1,
        10,
        undefined,
        'percentage',
      );

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          deletedAt: null,
          discountPercentage: { not: null },
          discountAmount: null,
        },
        select: {
          ...mockCouponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: coupons,
        totalCoupons,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return coupons with fixed amount type filter', async () => {
      const coupons = [mockCoupon];
      const totalCoupons = 1;

      prismaService.coupon.findMany.mockResolvedValue(coupons);
      prismaService.coupon.count.mockResolvedValue(totalCoupons);

      const result = await service.findByStore(
        'store-123',
        1,
        10,
        undefined,
        'fixed',
      );

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          deletedAt: null,
          discountAmount: { not: null },
          discountPercentage: null,
        },
        select: {
          ...mockCouponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: coupons,
        totalCoupons,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return coupons with first-purchase type filter', async () => {
      const coupons = [mockCoupon];
      const totalCoupons = 1;

      prismaService.coupon.findMany.mockResolvedValue(coupons);
      prismaService.coupon.count.mockResolvedValue(totalCoupons);

      const result = await service.findByStore(
        'store-123',
        1,
        10,
        undefined,
        'first-purchase',
      );

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          deletedAt: null,
          isFirstPurchase: true,
        },
        select: {
          ...mockCouponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: coupons,
        totalCoupons,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return all coupon types when type is all', async () => {
      const coupons = [mockCoupon];
      const totalCoupons = 1;

      prismaService.coupon.findMany.mockResolvedValue(coupons);
      prismaService.coupon.count.mockResolvedValue(totalCoupons);

      const result = await service.findByStore(
        'store-123',
        1,
        10,
        undefined,
        'all',
      );

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-123', deletedAt: null },
        select: {
          ...mockCouponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: coupons,
        totalCoupons,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return coupons with active status filter', async () => {
      const coupons = [mockCoupon];
      const totalCoupons = 1;

      prismaService.coupon.findMany.mockResolvedValue(coupons);
      prismaService.coupon.count.mockResolvedValue(totalCoupons);

      const result = await service.findByStore(
        'store-123',
        1,
        10,
        undefined,
        undefined,
        true,
      );

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          deletedAt: null,
          isActive: true,
        },
        select: {
          ...mockCouponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(prismaService.coupon.count).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          deletedAt: null,
          isActive: true,
        },
      });
      expect(result).toEqual({
        data: coupons,
        totalCoupons,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return coupons with inactive status filter', async () => {
      const coupons = [mockCoupon];
      const totalCoupons = 1;

      prismaService.coupon.findMany.mockResolvedValue(coupons);
      prismaService.coupon.count.mockResolvedValue(totalCoupons);

      const result = await service.findByStore(
        'store-123',
        1,
        10,
        undefined,
        undefined,
        false,
      );

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          deletedAt: null,
          isActive: false,
        },
        select: {
          ...mockCouponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(prismaService.coupon.count).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          deletedAt: null,
          isActive: false,
        },
      });
      expect(result).toEqual({
        data: coupons,
        totalCoupons,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return all coupons when no status filter is applied', async () => {
      const coupons = [mockCoupon];
      const totalCoupons = 1;

      prismaService.coupon.findMany.mockResolvedValue(coupons);
      prismaService.coupon.count.mockResolvedValue(totalCoupons);

      const result = await service.findByStore(
        'store-123',
        1,
        10,
        undefined,
        undefined,
        undefined,
      );

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-123', deletedAt: null },
        select: {
          ...mockCouponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: coupons,
        totalCoupons,
        page: 1,
        totalPages: 1,
      });
    });

    it('should handle errors', async () => {
      prismaService.coupon.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findByStore('store-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByInfluencer', () => {
    it('should return coupons by influencer id', async () => {
      const mockCoupons = [mockCoupon];
      prismaService.coupon.findMany.mockResolvedValue(mockCoupons);

      const result = await service.findByInfluencer('influencer-123');

      expect(result).toEqual(mockCoupons);
      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: { influencerId: 'influencer-123', deletedAt: null },
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
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
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
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
        },
        select: expect.any(Object),
      });
    });
  });

  describe('create', () => {
    const createCouponDto: CreateCouponDto = {
      title: 'WELCOME10',
      influencerId: 'influencer-123',
      discountPercentage: 10.0,
      discountAmount: null,
      expiresAt: '2025-12-31T23:59:59.000Z',
      maxUses: 100,
      minOrderAmount: 20.0,
      isActive: true,
      isFirstPurchase: true,
    };

    it('should create a coupon successfully', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findFirst.mockResolvedValue(null);
      prismaService.coupon.create.mockResolvedValue(mockCoupon);

      const result = await service.create(createCouponDto, 'store-123');

      expect(result).toEqual(mockCoupon);
      expect(prismaService.coupon.create).toHaveBeenCalledWith({
        data: {
          title: 'WELCOME10',
          influencerId: 'influencer-123',
          storeId: 'store-123',
          isActive: true,
          isFirstPurchase: true,
          isOneTimePerBigoId: false,
          discountPercentage: 10.0,
          expiresAt: new Date('2025-12-31T23:59:59.000Z'),
          maxUses: 100,
          minOrderAmount: 20.0,
        },
        select: expect.any(Object),
      });
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createCouponDto, 'store-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when influencer not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createCouponDto, 'store-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when coupon title already exists', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findFirst.mockResolvedValue(mockCoupon);

      await expect(
        service.create(createCouponDto, 'store-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when both discount percentage and amount are provided', async () => {
      const invalidDto = { ...createCouponDto, discountAmount: 5.0 };
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findFirst.mockResolvedValue(null);

      await expect(service.create(invalidDto, 'store-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when neither discount percentage nor amount is provided', async () => {
      const invalidDto = {
        ...createCouponDto,
        discountPercentage: null,
        discountAmount: null,
      };
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findFirst.mockResolvedValue(null);

      await expect(service.create(invalidDto, 'store-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when fixed discount amount is greater than minimum order amount', async () => {
      const invalidDto = {
        ...createCouponDto,
        discountAmount: 50.0,
        minOrderAmount: 30.0,
        discountPercentage: null,
      };
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findFirst.mockResolvedValue(null);

      await expect(service.create(invalidDto, 'store-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a coupon with isOneTimePerBigoId set to true', async () => {
      const createCouponDtoWithBigoId: CreateCouponDto = {
        title: 'ONETIME10',
        influencerId: 'influencer-123',
        discountPercentage: 10.0,
        discountAmount: null,
        expiresAt: '2025-12-31T23:59:59.000Z',
        maxUses: 100,
        minOrderAmount: 20.0,
        isActive: true,
        isFirstPurchase: false,
        isOneTimePerBigoId: true,
      };
      const couponWithBigoId = {
        ...mockCoupon,
        title: 'ONETIME10',
        isOneTimePerBigoId: true,
      };

      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findFirst.mockResolvedValue(null);
      prismaService.coupon.create.mockResolvedValue(couponWithBigoId);

      const result = await service.create(
        createCouponDtoWithBigoId,
        'store-123',
      );

      expect(result).toEqual(couponWithBigoId);
      expect(prismaService.coupon.create).toHaveBeenCalledWith({
        data: {
          title: 'ONETIME10',
          influencerId: 'influencer-123',
          storeId: 'store-123',
          isActive: true,
          isFirstPurchase: false,
          isOneTimePerBigoId: true,
          discountPercentage: 10.0,
          expiresAt: new Date('2025-12-31T23:59:59.000Z'),
          maxUses: 100,
          minOrderAmount: 20.0,
        },
        select: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    const updateCouponDto: UpdateCouponDto = {
      title: 'UPDATED10',
      discountPercentage: 15.0,
    };

    it('should update a coupon successfully', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockCoupon);
      prismaService.coupon.update.mockResolvedValue({
        ...mockCoupon,
        ...updateCouponDto,
      });

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

      await expect(
        service.update('invalid-id', updateCouponDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should switch from percentage to amount discount', async () => {
      const currentCoupon = {
        ...mockCoupon,
        discountPercentage: 15.0,
        discountAmount: null,
      };
      const updateDto = { discountAmount: 10.0 };
      const expectedResult = {
        ...currentCoupon,
        discountAmount: 10.0,
        discountPercentage: null,
      };

      prismaService.coupon.findUnique.mockResolvedValue(currentCoupon);
      prismaService.coupon.update.mockResolvedValue(expectedResult);

      const result = await service.update('coupon-123', updateDto);

      expect(result).toEqual(expectedResult);
      expect(prismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        data: { discountAmount: 10.0, discountPercentage: null },
        select: expect.any(Object),
      });
    });

    it('should switch from amount to percentage discount', async () => {
      const currentCoupon = {
        ...mockCoupon,
        discountAmount: 10.0,
        discountPercentage: null,
      };
      const updateDto = { discountPercentage: 15.0 };
      const expectedResult = {
        ...currentCoupon,
        discountPercentage: 15.0,
        discountAmount: null,
      };

      prismaService.coupon.findUnique.mockResolvedValue(currentCoupon);
      prismaService.coupon.update.mockResolvedValue(expectedResult);

      const result = await service.update('coupon-123', updateDto);

      expect(result).toEqual(expectedResult);
      expect(prismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        data: { discountPercentage: 15.0, discountAmount: null },
        select: expect.any(Object),
      });
    });

    it('should throw error when both discount types are provided with values', async () => {
      const currentCoupon = {
        ...mockCoupon,
        discountPercentage: 15.0,
        discountAmount: null,
      };
      const updateDto = { discountPercentage: 20.0, discountAmount: 10.0 };

      prismaService.coupon.findUnique.mockResolvedValue(currentCoupon);

      await expect(service.update('coupon-123', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not throw validation error when switching discount types', async () => {
      const currentCoupon = {
        ...mockCoupon,
        discountPercentage: 15.0,
        discountAmount: null,
      };
      const updateDto = { discountAmount: 10.0 };
      const expectedResult = {
        ...currentCoupon,
        discountAmount: 10.0,
        discountPercentage: null,
      };

      prismaService.coupon.findUnique.mockResolvedValue(currentCoupon);
      prismaService.coupon.update.mockResolvedValue(expectedResult);

      // This should not throw any validation errors
      const result = await service.update('coupon-123', updateDto);

      expect(result).toEqual(expectedResult);
      expect(prismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        data: { discountAmount: 10.0, discountPercentage: null },
        select: expect.any(Object),
      });
    });

    it('should handle real-world scenario: percentage to amount switch', async () => {
      // Simulate a coupon that was saved with percentage discount
      const currentCoupon = {
        ...mockCoupon,
        discountPercentage: 20.0,
        discountAmount: null,
        storeId: 'store-123',
      };

      // User wants to change to fixed amount (only sends discountAmount)
      const updateDto = { discountAmount: 15.0 };
      const expectedResult = {
        ...currentCoupon,
        discountAmount: 15.0,
        discountPercentage: null,
      };

      prismaService.coupon.findUnique.mockResolvedValue(currentCoupon);
      prismaService.coupon.update.mockResolvedValue(expectedResult);

      // This should work without any validation errors
      const result = await service.update('coupon-123', updateDto);

      expect(result).toEqual(expectedResult);
      expect(prismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        data: { discountAmount: 15.0, discountPercentage: null },
        select: expect.any(Object),
      });
    });

    it('should debug: check what happens when only discountAmount is sent', async () => {
      const currentCoupon = {
        ...mockCoupon,
        discountPercentage: 20.0,
        discountAmount: null,
        storeId: 'store-123',
      };

      // Only send discountAmount, discountPercentage should not be in the DTO
      const updateDto = { discountAmount: 15.0 };

      prismaService.coupon.findUnique.mockResolvedValue(currentCoupon);
      prismaService.coupon.update.mockResolvedValue({
        ...currentCoupon,
        ...updateDto,
      });

      // This should not throw any errors
      expect(async () => {
        await service.update('coupon-123', updateDto);
      }).not.toThrow();
    });

    it('should throw BadRequestException when fixed discount amount is greater than minimum order amount in update', async () => {
      const currentCoupon = {
        ...mockCoupon,
        discountPercentage: 20.0,
        discountAmount: null,
        storeId: 'store-123',
      };

      const updateDto = {
        discountAmount: 50.0,
        minOrderAmount: 30.0,
      };

      prismaService.coupon.findUnique.mockResolvedValue(currentCoupon);

      await expect(service.update('coupon-123', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow fixed discount amount equal to minimum order amount', async () => {
      const currentCoupon = {
        ...mockCoupon,
        discountPercentage: 20.0,
        discountAmount: null,
        storeId: 'store-123',
      };

      const updateDto = {
        discountAmount: 30.0,
        minOrderAmount: 30.0,
      };

      const expectedResult = {
        ...currentCoupon,
        discountAmount: 30.0,
        minOrderAmount: 30.0,
        discountPercentage: null,
      };

      prismaService.coupon.findUnique.mockResolvedValue(currentCoupon);
      prismaService.coupon.update.mockResolvedValue(expectedResult);

      const result = await service.update('coupon-123', updateDto);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should remove a coupon successfully', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockCoupon);
      prismaService.coupon.update.mockResolvedValue(mockCoupon);

      const result = await service.remove('coupon-123');

      expect(result).toEqual(mockCoupon);
      expect(prismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        data: { deletedAt: expect.any(Date) },
        select: expect.any(Object),
      });
    });

    it('should remove a coupon even with associated usages', async () => {
      prismaService.coupon.findUnique.mockResolvedValue(mockCoupon);
      prismaService.coupon.update.mockResolvedValue(mockCoupon);

      const result = await service.remove('coupon-123');

      expect(result).toEqual(mockCoupon);
      expect(prismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        data: { deletedAt: expect.any(Date) },
        select: expect.any(Object),
      });
    });
  });

  describe('getFeaturedCoupons', () => {
    it('should return featured coupons by store successfully', async () => {
      const mockFeaturedCoupons = [
        {
          id: 'featured-1',
          storeId: 'store-123',
          couponId: 'coupon-123',
          createdAt: new Date('2024-12-20'),
          coupon: {
            ...mockCoupon,
            influencer: {
              id: 'influencer-123',
              name: 'João Silva',
              email: 'joao@exemplo.com',
            },
          },
        },
      ];

      prismaService.featuredCoupon.findMany.mockResolvedValue(
        mockFeaturedCoupons,
      );

      const result = await service.getFeaturedCoupons('store-123');

      expect(prismaService.featuredCoupon.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          coupon: {
            deletedAt: null,
          },
        },
        include: {
          coupon: {
            select: {
              ...mockCouponSelect,
              influencer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual([
        {
          ...mockCoupon,
          influencer: {
            id: 'influencer-123',
            name: 'João Silva',
            email: 'joao@exemplo.com',
          },
          featuredAt: mockFeaturedCoupons[0].createdAt,
        },
      ]);
    });

    it('should return empty array when no featured coupons exist', async () => {
      prismaService.featuredCoupon.findMany.mockResolvedValue([]);

      const result = await service.getFeaturedCoupons('store-123');

      expect(result).toEqual([]);
      expect(prismaService.featuredCoupon.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          coupon: {
            deletedAt: null,
          },
        },
        include: {
          coupon: {
            select: {
              ...mockCouponSelect,
              influencer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should throw BadRequestException when prisma fails', async () => {
      prismaService.featuredCoupon.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getFeaturedCoupons('store-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addFeaturedCoupon', () => {
    it('should add a coupon to featured list successfully', async () => {
      const mockFeaturedCoupon = {
        id: 'featured-1',
        storeId: 'store-123',
        couponId: 'coupon-123',
        createdAt: new Date('2024-12-20'),
        coupon: {
          ...mockCoupon,
          influencer: {
            id: 'influencer-123',
            name: 'João Silva',
            email: 'joao@exemplo.com',
          },
        },
      };

      prismaService.coupon.findFirst.mockResolvedValue(mockCoupon);
      prismaService.featuredCoupon.findUnique.mockResolvedValue(null);
      prismaService.featuredCoupon.create.mockResolvedValue(mockFeaturedCoupon);

      const result = await service.addFeaturedCoupon('store-123', 'coupon-123');

      expect(prismaService.coupon.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'coupon-123',
          storeId: 'store-123',
          deletedAt: null,
        },
      });
      expect(prismaService.featuredCoupon.findUnique).toHaveBeenCalledWith({
        where: {
          storeId_couponId: {
            storeId: 'store-123',
            couponId: 'coupon-123',
          },
        },
      });
      expect(prismaService.featuredCoupon.create).toHaveBeenCalledWith({
        data: {
          storeId: 'store-123',
          couponId: 'coupon-123',
        },
        include: {
          coupon: {
            select: {
              ...mockCouponSelect,
              influencer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });
      expect(result).toEqual({
        ...mockCoupon,
        influencer: {
          id: 'influencer-123',
          name: 'João Silva',
          email: 'joao@exemplo.com',
        },
        featuredAt: mockFeaturedCoupon.createdAt,
      });
    });

    it('should throw BadRequestException when coupon not found', async () => {
      prismaService.coupon.findFirst.mockResolvedValue(null);

      await expect(
        service.addFeaturedCoupon('store-123', 'invalid-coupon-id'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaService.coupon.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'invalid-coupon-id',
          storeId: 'store-123',
          deletedAt: null,
        },
      });
    });

    it('should throw BadRequestException when coupon does not belong to store', async () => {
      prismaService.coupon.findFirst.mockResolvedValue(null);

      await expect(
        service.addFeaturedCoupon('store-123', 'coupon-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when coupon is already in featured list', async () => {
      const existingFeatured = {
        id: 'featured-1',
        storeId: 'store-123',
        couponId: 'coupon-123',
      };

      prismaService.coupon.findFirst.mockResolvedValue(mockCoupon);
      prismaService.featuredCoupon.findUnique.mockResolvedValue(
        existingFeatured,
      );

      await expect(
        service.addFeaturedCoupon('store-123', 'coupon-123'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaService.featuredCoupon.findUnique).toHaveBeenCalledWith({
        where: {
          storeId_couponId: {
            storeId: 'store-123',
            couponId: 'coupon-123',
          },
        },
      });
    });

    it('should throw BadRequestException when prisma fails', async () => {
      prismaService.coupon.findFirst.mockResolvedValue(mockCoupon);
      prismaService.featuredCoupon.findUnique.mockResolvedValue(null);
      prismaService.featuredCoupon.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.addFeaturedCoupon('store-123', 'coupon-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeFeaturedCoupon', () => {
    it('should remove a coupon from featured list successfully', async () => {
      const mockFeaturedCoupon = {
        id: 'featured-1',
        storeId: 'store-123',
        couponId: 'coupon-123',
      };

      prismaService.featuredCoupon.findUnique.mockResolvedValue(
        mockFeaturedCoupon,
      );
      prismaService.featuredCoupon.delete.mockResolvedValue(
        mockFeaturedCoupon,
      );

      const result = await service.removeFeaturedCoupon(
        'store-123',
        'coupon-123',
      );

      expect(prismaService.featuredCoupon.findUnique).toHaveBeenCalledWith({
        where: {
          storeId_couponId: {
            storeId: 'store-123',
            couponId: 'coupon-123',
          },
        },
      });
      expect(prismaService.featuredCoupon.delete).toHaveBeenCalledWith({
        where: {
          id: 'featured-1',
        },
      });
      expect(result).toEqual({
        message: 'Coupon removed from featured list successfully',
      });
    });

    it('should throw BadRequestException when coupon is not in featured list', async () => {
      prismaService.featuredCoupon.findUnique.mockResolvedValue(null);

      await expect(
        service.removeFeaturedCoupon('store-123', 'coupon-123'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaService.featuredCoupon.findUnique).toHaveBeenCalledWith({
        where: {
          storeId_couponId: {
            storeId: 'store-123',
            couponId: 'coupon-123',
          },
        },
      });
    });

    it('should throw BadRequestException when prisma fails', async () => {
      prismaService.featuredCoupon.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.removeFeaturedCoupon('store-123', 'coupon-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
