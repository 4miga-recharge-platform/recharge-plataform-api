import { Test, TestingModule } from '@nestjs/testing';
import { CouponController } from '../coupon.controller';
import { CouponService } from '../coupon.service';
import { CreateCouponDto } from '../dto/create-coupon.dto';
import { UpdateCouponDto } from '../dto/update-coupon.dto';

describe('CouponController', () => {
  let controller: CouponController;
  let couponService: any;

  const mockCoupon = {
    id: 'coupon-123',
    title: 'Desconto 10%',
    discountPercentage: 10,
    discountAmount: null,
    expiresAt: new Date('2024-12-31'),
    timesUsed: 5,
    totalSalesAmount: 1000,
    maxUses: 100,
    minOrderAmount: 50,
    isActive: true,
    isFirstPurchase: false,
    storeId: 'store-123',
    influencerId: 'influencer-123',
    influencer: {
      id: 'influencer-123',
      name: 'João Silva',
      email: 'joao@exemplo.com',
    },
  };

  const mockRequest = {
    user: {
      storeId: 'store-123',
      id: 'user-123',
      role: 'RESELLER_ADMIN_4MIGA_USER',
    },
  };

  beforeEach(async () => {
    const mockCouponService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByStore: jest.fn(),
      findByInfluencer: jest.fn(),
      findActiveByStore: jest.fn(),
      findFirstPurchaseByStore: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getFeaturedCoupons: jest.fn(),
      addFeaturedCoupon: jest.fn(),
      removeFeaturedCoupon: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponController],
      providers: [
        {
          provide: CouponService,
          useValue: mockCouponService,
        },
      ],
    }).compile();

    controller = module.get<CouponController>(CouponController);
    couponService = module.get(CouponService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all coupons with pagination successfully', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1,
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest);

      expect(couponService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with custom pagination parameters', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 2,
        totalPages: 2,
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 2, 5);

      expect(couponService.findByStore).toHaveBeenCalledWith(
        'store-123',
        2,
        5,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with search filter', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1,
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, 'desconto');

      expect(couponService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        'desconto',
        undefined,
        undefined,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with type filter percentage', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1,
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(
        mockRequest,
        1,
        10,
        undefined,
        'percentage',
      );

      expect(couponService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        'percentage',
        undefined,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with type filter fixed', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1,
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(
        mockRequest,
        1,
        10,
        undefined,
        'fixed',
      );

      expect(couponService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        'fixed',
        undefined,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with type filter first-purchase', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1,
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(
        mockRequest,
        1,
        10,
        undefined,
        'first-purchase',
      );

      expect(couponService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        'first-purchase',
        undefined,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with type filter all', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1,
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(
        mockRequest,
        1,
        10,
        undefined,
        'all',
      );

      expect(couponService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        'all',
        undefined,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with active status filter', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1,
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(
        mockRequest,
        1,
        10,
        undefined,
        undefined,
        'active',
      );

      expect(couponService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        undefined,
        true,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with inactive status filter', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1,
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(
        mockRequest,
        1,
        10,
        undefined,
        undefined,
        'inactive',
      );

      expect(couponService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        undefined,
        false,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return all coupons when status is all', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1,
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(
        mockRequest,
        1,
        10,
        undefined,
        undefined,
        'all',
      );

      expect(couponService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should handle errors when fetching coupons', async () => {
      const error = new Error('Failed to fetch coupons');
      couponService.findByStore.mockRejectedValue(error);

      await expect(controller.findAll(mockRequest)).rejects.toThrow(
        'Failed to fetch coupons',
      );
      expect(couponService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('findActiveByStore', () => {
    it('should return active coupons by store successfully', async () => {
      const coupons = [mockCoupon];
      couponService.findActiveByStore.mockResolvedValue(coupons);

      const result = await controller.findActiveByStore('store-123');

      expect(couponService.findActiveByStore).toHaveBeenCalledWith('store-123');
      expect(result).toEqual(coupons);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch active coupons');
      couponService.findActiveByStore.mockRejectedValue(error);

      await expect(controller.findActiveByStore('store-123')).rejects.toThrow(
        'Failed to fetch active coupons',
      );
      expect(couponService.findActiveByStore).toHaveBeenCalledWith('store-123');
    });
  });

  describe('findFirstPurchaseByStore', () => {
    it('should return first purchase coupons by store successfully', async () => {
      const coupons = [mockCoupon];
      couponService.findFirstPurchaseByStore.mockResolvedValue(coupons);

      const result = await controller.findFirstPurchaseByStore('store-123');

      expect(couponService.findFirstPurchaseByStore).toHaveBeenCalledWith(
        'store-123',
      );
      expect(result).toEqual(coupons);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch first purchase coupons');
      couponService.findFirstPurchaseByStore.mockRejectedValue(error);

      await expect(
        controller.findFirstPurchaseByStore('store-123'),
      ).rejects.toThrow('Failed to fetch first purchase coupons');
      expect(couponService.findFirstPurchaseByStore).toHaveBeenCalledWith(
        'store-123',
      );
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
      couponService.create.mockResolvedValue(mockCoupon);

      const result = await controller.create(createCouponDto, mockRequest);

      expect(couponService.create).toHaveBeenCalledWith(
        createCouponDto,
        'store-123',
      );
      expect(result).toEqual(mockCoupon);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create coupon');
      couponService.create.mockRejectedValue(error);

      await expect(
        controller.create(createCouponDto, mockRequest),
      ).rejects.toThrow('Failed to create coupon');
      expect(couponService.create).toHaveBeenCalledWith(
        createCouponDto,
        'store-123',
      );
    });
  });

  describe('findOne', () => {
    it('should return a coupon by id successfully', async () => {
      couponService.findOne.mockResolvedValue(mockCoupon);

      const result = await controller.findOne('coupon-123');

      expect(couponService.findOne).toHaveBeenCalledWith('coupon-123');
      expect(result).toEqual(mockCoupon);
    });

    it('should handle errors when fetching coupon by id', async () => {
      const error = new Error('Failed to fetch coupon');
      couponService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('coupon-123')).rejects.toThrow(
        'Failed to fetch coupon',
      );
      expect(couponService.findOne).toHaveBeenCalledWith('coupon-123');
    });
  });

  describe('update', () => {
    const updateCouponDto: UpdateCouponDto = {
      title: 'WELCOME15',
      discountPercentage: 15.0,
    };

    it('should update a coupon successfully', async () => {
      const updatedCoupon = { ...mockCoupon, ...updateCouponDto };
      couponService.update.mockResolvedValue(updatedCoupon);

      const result = await controller.update('coupon-123', updateCouponDto);

      expect(couponService.update).toHaveBeenCalledWith(
        'coupon-123',
        updateCouponDto,
      );
      expect(result).toEqual(updatedCoupon);
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update coupon');
      couponService.update.mockRejectedValue(error);

      await expect(
        controller.update('coupon-123', updateCouponDto),
      ).rejects.toThrow('Failed to update coupon');
      expect(couponService.update).toHaveBeenCalledWith(
        'coupon-123',
        updateCouponDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a coupon successfully', async () => {
      couponService.remove.mockResolvedValue(mockCoupon);

      const result = await controller.remove('coupon-123');

      expect(couponService.remove).toHaveBeenCalledWith('coupon-123');
      expect(result).toEqual(mockCoupon);
    });

    it('should handle removal errors', async () => {
      const error = new Error('Failed to remove coupon');
      couponService.remove.mockRejectedValue(error);

      await expect(controller.remove('coupon-123')).rejects.toThrow(
        'Failed to remove coupon',
      );
      expect(couponService.remove).toHaveBeenCalledWith('coupon-123');
    });
  });

  describe('getFeaturedCoupons', () => {
    it('should return featured coupons by store successfully', async () => {
      const featuredCoupons = [
        {
          ...mockCoupon,
          featuredAt: new Date('2024-12-20'),
        },
      ];
      couponService.getFeaturedCoupons.mockResolvedValue(featuredCoupons);

      const result = await controller.getFeaturedCoupons('store-123');

      expect(couponService.getFeaturedCoupons).toHaveBeenCalledWith(
        'store-123',
      );
      expect(result).toEqual(featuredCoupons);
    });

    it('should return empty array when no featured coupons exist', async () => {
      couponService.getFeaturedCoupons.mockResolvedValue([]);

      const result = await controller.getFeaturedCoupons('store-123');

      expect(couponService.getFeaturedCoupons).toHaveBeenCalledWith(
        'store-123',
      );
      expect(result).toEqual([]);
    });

    it('should handle errors when fetching featured coupons', async () => {
      const error = new Error('Failed to fetch featured coupons');
      couponService.getFeaturedCoupons.mockRejectedValue(error);

      await expect(controller.getFeaturedCoupons('store-123')).rejects.toThrow(
        'Failed to fetch featured coupons',
      );
      expect(couponService.getFeaturedCoupons).toHaveBeenCalledWith(
        'store-123',
      );
    });
  });

  describe('addFeaturedCoupon', () => {
    const addFeaturedCouponDto = {
      couponId: 'coupon-123',
    };

    it('should add a coupon to featured list successfully', async () => {
      const featuredCoupon = {
        ...mockCoupon,
        featuredAt: new Date('2024-12-20'),
      };
      couponService.addFeaturedCoupon.mockResolvedValue(featuredCoupon);

      const result = await controller.addFeaturedCoupon(
        addFeaturedCouponDto,
        mockRequest,
      );

      expect(couponService.addFeaturedCoupon).toHaveBeenCalledWith(
        'store-123',
        'coupon-123',
      );
      expect(result).toEqual(featuredCoupon);
    });

    it('should handle errors when adding featured coupon', async () => {
      const error = new Error('Failed to add featured coupon');
      couponService.addFeaturedCoupon.mockRejectedValue(error);

      await expect(
        controller.addFeaturedCoupon(addFeaturedCouponDto, mockRequest),
      ).rejects.toThrow('Failed to add featured coupon');
      expect(couponService.addFeaturedCoupon).toHaveBeenCalledWith(
        'store-123',
        'coupon-123',
      );
    });

    it('should throw BadRequestException when coupon not found', async () => {
      const error = new Error('Coupon not found or does not belong to this store');
      couponService.addFeaturedCoupon.mockRejectedValue(error);

      await expect(
        controller.addFeaturedCoupon(addFeaturedCouponDto, mockRequest),
      ).rejects.toThrow('Coupon not found or does not belong to this store');
    });

    it('should throw BadRequestException when coupon already in featured list', async () => {
      const error = new Error('Coupon is already in the featured list');
      couponService.addFeaturedCoupon.mockRejectedValue(error);

      await expect(
        controller.addFeaturedCoupon(addFeaturedCouponDto, mockRequest),
      ).rejects.toThrow('Coupon is already in the featured list');
    });
  });

  describe('removeFeaturedCoupon', () => {
    it('should remove a coupon from featured list successfully', async () => {
      const successMessage = {
        message: 'Coupon removed from featured list successfully',
      };
      couponService.removeFeaturedCoupon.mockResolvedValue(successMessage);

      const result = await controller.removeFeaturedCoupon(
        'coupon-123',
        mockRequest,
      );

      expect(couponService.removeFeaturedCoupon).toHaveBeenCalledWith(
        'store-123',
        'coupon-123',
      );
      expect(result).toEqual(successMessage);
    });

    it('should handle errors when removing featured coupon', async () => {
      const error = new Error('Failed to remove featured coupon');
      couponService.removeFeaturedCoupon.mockRejectedValue(error);

      await expect(
        controller.removeFeaturedCoupon('coupon-123', mockRequest),
      ).rejects.toThrow('Failed to remove featured coupon');
      expect(couponService.removeFeaturedCoupon).toHaveBeenCalledWith(
        'store-123',
        'coupon-123',
      );
    });

    it('should throw BadRequestException when coupon is not in featured list', async () => {
      const error = new Error('Coupon is not in the featured list');
      couponService.removeFeaturedCoupon.mockRejectedValue(error);

      await expect(
        controller.removeFeaturedCoupon('coupon-123', mockRequest),
      ).rejects.toThrow('Coupon is not in the featured list');
    });
  });
});
