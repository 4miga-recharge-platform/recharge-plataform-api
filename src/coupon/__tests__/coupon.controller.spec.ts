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
      validateCoupon: jest.fn(),
      applyCoupon: jest.fn(),
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
        totalPages: 1
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest);

      expect(couponService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, undefined, undefined);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with custom pagination parameters', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 2,
        totalPages: 2
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 2, 5);

      expect(couponService.findByStore).toHaveBeenCalledWith('store-123', 2, 5, undefined, undefined, undefined);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with search filter', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, 'desconto');

      expect(couponService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, 'desconto', undefined, undefined);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with type filter percentage', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, undefined, 'percentage');

      expect(couponService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, 'percentage', undefined);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with type filter fixed', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, undefined, 'fixed');

      expect(couponService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, 'fixed', undefined);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with type filter first-purchase', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, undefined, 'first-purchase');

      expect(couponService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, 'first-purchase', undefined);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with type filter all', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, undefined, 'all');

      expect(couponService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, 'all', undefined);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with active status filter', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, undefined, undefined, 'active');

      expect(couponService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, undefined, true);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return coupons with inactive status filter', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, undefined, undefined, 'inactive');

      expect(couponService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, undefined, false);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return all coupons when status is all', async () => {
      const paginatedResponse = {
        data: [mockCoupon],
        totalCoupons: 1,
        page: 1,
        totalPages: 1
      };
      couponService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, undefined, undefined, 'all');

      expect(couponService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, undefined, undefined);
      expect(result).toEqual(paginatedResponse);
    });

    it('should handle errors when fetching coupons', async () => {
      const error = new Error('Failed to fetch coupons');
      couponService.findByStore.mockRejectedValue(error);

      await expect(controller.findAll(mockRequest)).rejects.toThrow('Failed to fetch coupons');
      expect(couponService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, undefined, undefined);
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

      await expect(controller.findActiveByStore('store-123')).rejects.toThrow('Failed to fetch active coupons');
      expect(couponService.findActiveByStore).toHaveBeenCalledWith('store-123');
    });
  });

  describe('findFirstPurchaseByStore', () => {
    it('should return first purchase coupons by store successfully', async () => {
      const coupons = [mockCoupon];
      couponService.findFirstPurchaseByStore.mockResolvedValue(coupons);

      const result = await controller.findFirstPurchaseByStore('store-123');

      expect(couponService.findFirstPurchaseByStore).toHaveBeenCalledWith('store-123');
      expect(result).toEqual(coupons);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch first purchase coupons');
      couponService.findFirstPurchaseByStore.mockRejectedValue(error);

      await expect(controller.findFirstPurchaseByStore('store-123')).rejects.toThrow('Failed to fetch first purchase coupons');
      expect(couponService.findFirstPurchaseByStore).toHaveBeenCalledWith('store-123');
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
    };

    it('should create a coupon successfully', async () => {
      couponService.create.mockResolvedValue(mockCoupon);

      const result = await controller.create(createCouponDto, mockRequest);

      expect(couponService.create).toHaveBeenCalledWith(createCouponDto, 'store-123');
      expect(result).toEqual(mockCoupon);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create coupon');
      couponService.create.mockRejectedValue(error);

      await expect(controller.create(createCouponDto, mockRequest)).rejects.toThrow('Failed to create coupon');
      expect(couponService.create).toHaveBeenCalledWith(createCouponDto, 'store-123');
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

      await expect(controller.findOne('coupon-123')).rejects.toThrow('Failed to fetch coupon');
      expect(couponService.findOne).toHaveBeenCalledWith('coupon-123');
    });
  });

  describe('update', () => {
    const updateCouponDto: UpdateCouponDto = {
      title: 'WELCOME15',
      discountPercentage: 15.00,
    };

    it('should update a coupon successfully', async () => {
      const updatedCoupon = { ...mockCoupon, ...updateCouponDto };
      couponService.update.mockResolvedValue(updatedCoupon);

      const result = await controller.update('coupon-123', updateCouponDto);

      expect(couponService.update).toHaveBeenCalledWith('coupon-123', updateCouponDto);
      expect(result).toEqual(updatedCoupon);
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update coupon');
      couponService.update.mockRejectedValue(error);

      await expect(controller.update('coupon-123', updateCouponDto)).rejects.toThrow('Failed to update coupon');
      expect(couponService.update).toHaveBeenCalledWith('coupon-123', updateCouponDto);
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

      await expect(controller.remove('coupon-123')).rejects.toThrow('Failed to remove coupon');
      expect(couponService.remove).toHaveBeenCalledWith('coupon-123');
    });
  });

  describe('validateCoupon', () => {
    it('should validate a coupon successfully', async () => {
      const validationResult = { valid: true };
      couponService.validateCoupon.mockResolvedValue(validationResult);

      const result = await controller.validateCoupon('coupon-123', '25.00');

      expect(couponService.validateCoupon).toHaveBeenCalledWith('coupon-123', 25.00);
      expect(result).toEqual(validationResult);
    });



    it('should handle errors', async () => {
      const error = new Error('Failed to validate coupon');
      couponService.validateCoupon.mockRejectedValue(error);

      await expect(controller.validateCoupon('coupon-123', '25.00')).rejects.toThrow('Failed to validate coupon');
    });
  });

  describe('applyCoupon', () => {
    it('should apply a coupon successfully', async () => {
      const applyResult = { discountAmount: 10.00, finalAmount: 90.00 };
      couponService.applyCoupon.mockResolvedValue(applyResult);

      const result = await controller.applyCoupon('coupon-123', '100.00');

      expect(couponService.applyCoupon).toHaveBeenCalledWith('coupon-123', 100.00);
      expect(result).toEqual(applyResult);
    });



    it('should handle errors', async () => {
      const error = new Error('Failed to apply coupon');
      couponService.applyCoupon.mockRejectedValue(error);

      await expect(controller.applyCoupon('coupon-123', '100.00')).rejects.toThrow('Failed to apply coupon');
    });
  });
});
