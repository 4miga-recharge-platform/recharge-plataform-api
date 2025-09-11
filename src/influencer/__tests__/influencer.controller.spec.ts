import { Test, TestingModule } from '@nestjs/testing';
import { InfluencerController } from '../influencer.controller';
import { InfluencerService } from '../influencer.service';
import { CouponService } from '../../coupon/coupon.service';
import { CreateInfluencerDto } from '../dto/create-influencer.dto';
import { UpdateInfluencerDto } from '../dto/update-influencer.dto';

describe('InfluencerController', () => {
  let controller: InfluencerController;
  let influencerService: any;
  let couponService: any;

  const mockInfluencer = {
    id: 'influencer-123',
    name: 'João Silva',
    email: 'joao@exemplo.com',
    phone: '+5511999999999',
    paymentMethod: 'pix',
    paymentData: 'PIX_JOAO123',
    isActive: true,
    storeId: 'store-123',
  };

  const mockRequest = {
    user: {
      storeId: 'store-123',
      id: 'user-123',
      role: 'RESELLER_ADMIN_4MIGA_USER',
    },
  };

  beforeEach(async () => {
    const mockInfluencerService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByStore: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockCouponService = {
      findByInfluencerWithPagination: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InfluencerController],
      providers: [
        {
          provide: InfluencerService,
          useValue: mockInfluencerService,
        },
        {
          provide: CouponService,
          useValue: mockCouponService,
        },
      ],
    }).compile();

    controller = module.get<InfluencerController>(InfluencerController);
    influencerService = module.get(InfluencerService);
    couponService = module.get(CouponService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all influencers with pagination successfully', async () => {
      const paginatedResponse = {
        data: [mockInfluencer],
        totalInfluencers: 1,
        page: 1,
        totalPages: 1
      };
      influencerService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest);

      expect(influencerService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, undefined);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return influencers with custom pagination parameters', async () => {
      const paginatedResponse = {
        data: [mockInfluencer],
        totalInfluencers: 1,
        page: 2,
        totalPages: 2
      };
      influencerService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 2, 5);

      expect(influencerService.findByStore).toHaveBeenCalledWith('store-123', 2, 5, undefined, undefined);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return influencers with search filter', async () => {
      const paginatedResponse = {
        data: [mockInfluencer],
        totalInfluencers: 1,
        page: 1,
        totalPages: 1
      };
      influencerService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, 'joão');

      expect(influencerService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, 'joão', undefined);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return influencers with active status filter', async () => {
      const paginatedResponse = {
        data: [mockInfluencer],
        totalInfluencers: 1,
        page: 1,
        totalPages: 1
      };
      influencerService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, undefined, 'active');

      expect(influencerService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, true);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return influencers with inactive status filter', async () => {
      const paginatedResponse = {
        data: [mockInfluencer],
        totalInfluencers: 1,
        page: 1,
        totalPages: 1
      };
      influencerService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, undefined, 'inactive');

      expect(influencerService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, false);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return all influencers when status is all', async () => {
      const paginatedResponse = {
        data: [mockInfluencer],
        totalInfluencers: 1,
        page: 1,
        totalPages: 1
      };
      influencerService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, undefined, 'all');

      expect(influencerService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, undefined);
      expect(result).toEqual(paginatedResponse);
    });

    it('should handle errors when fetching influencers', async () => {
      const error = new Error('Failed to fetch influencers');
      influencerService.findByStore.mockRejectedValue(error);

      await expect(controller.findAll(mockRequest)).rejects.toThrow('Failed to fetch influencers');
      expect(influencerService.findByStore).toHaveBeenCalledWith('store-123', 1, 10, undefined, undefined);
    });
  });

  describe('create', () => {
    const createInfluencerDto: CreateInfluencerDto = {
      name: 'João Silva',
      email: 'joao@exemplo.com',
      phone: '+5511999999999',
      paymentMethod: 'pix',
      paymentData: 'PIX_JOAO123',
      isActive: true,
    };

    it('should create an influencer successfully', async () => {
      influencerService.create.mockResolvedValue(mockInfluencer);

      const result = await controller.create(createInfluencerDto, mockRequest);

      expect(influencerService.create).toHaveBeenCalledWith(createInfluencerDto, 'store-123');
      expect(result).toEqual(mockInfluencer);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create influencer');
      influencerService.create.mockRejectedValue(error);

      await expect(controller.create(createInfluencerDto, mockRequest)).rejects.toThrow('Failed to create influencer');
      expect(influencerService.create).toHaveBeenCalledWith(createInfluencerDto, 'store-123');
    });
  });

  describe('findOne', () => {
    it('should return an influencer by id successfully', async () => {
      influencerService.findOne.mockResolvedValue(mockInfluencer);

      const result = await controller.findOne('influencer-123', mockRequest);

      expect(influencerService.findOne).toHaveBeenCalledWith('influencer-123', 'store-123');
      expect(result).toEqual(mockInfluencer);
    });

    it('should handle errors when fetching influencer by id', async () => {
      const error = new Error('Failed to fetch influencer');
      influencerService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('influencer-123', mockRequest)).rejects.toThrow('Failed to fetch influencer');
      expect(influencerService.findOne).toHaveBeenCalledWith('influencer-123', 'store-123');
    });
  });

  describe('update', () => {
    const updateInfluencerDto: UpdateInfluencerDto = {
      name: 'João Silva Atualizado',
      email: 'joao.novo@exemplo.com',
    };

    it('should update an influencer successfully', async () => {
      const updatedInfluencer = { ...mockInfluencer, ...updateInfluencerDto };
      influencerService.update.mockResolvedValue(updatedInfluencer);

      const result = await controller.update('influencer-123', updateInfluencerDto, mockRequest);

      expect(influencerService.update).toHaveBeenCalledWith('influencer-123', updateInfluencerDto, 'store-123');
      expect(result).toEqual(updatedInfluencer);
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update influencer');
      influencerService.update.mockRejectedValue(error);

      await expect(controller.update('influencer-123', updateInfluencerDto, mockRequest)).rejects.toThrow('Failed to update influencer');
      expect(influencerService.update).toHaveBeenCalledWith('influencer-123', updateInfluencerDto, 'store-123');
    });
  });

  describe('getInfluencerCoupons', () => {
    const mockCoupon = {
      id: 'coupon-123',
      title: 'Desconto 10%',
      influencerId: 'influencer-123',
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
    };

    const mockPaginatedResponse = {
      data: [mockCoupon],
      totalCoupons: 1,
      page: 1,
      totalPages: 1,
      influencerName: 'João Silva',
    };

    it('should return coupons for an influencer with pagination successfully', async () => {
      couponService.findByInfluencerWithPagination.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getInfluencerCoupons('influencer-123', mockRequest);

      expect(couponService.findByInfluencerWithPagination).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
        1,
        10,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return coupons with custom pagination parameters', async () => {
      const customResponse = { ...mockPaginatedResponse, page: 2, totalPages: 2 };
      couponService.findByInfluencerWithPagination.mockResolvedValue(customResponse);

      const result = await controller.getInfluencerCoupons('influencer-123', mockRequest, 2, 5);

      expect(couponService.findByInfluencerWithPagination).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
        2,
        5,
        undefined,
        undefined,
      );
      expect(result).toEqual(customResponse);
    });

    it('should return coupons with search filter', async () => {
      couponService.findByInfluencerWithPagination.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getInfluencerCoupons('influencer-123', mockRequest, 1, 10, 'desconto');

      expect(couponService.findByInfluencerWithPagination).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
        1,
        10,
        'desconto',
        undefined,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return coupons with active status filter', async () => {
      couponService.findByInfluencerWithPagination.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getInfluencerCoupons('influencer-123', mockRequest, 1, 10, undefined, 'active');

      expect(couponService.findByInfluencerWithPagination).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
        1,
        10,
        undefined,
        'active',
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return coupons with inactive status filter', async () => {
      couponService.findByInfluencerWithPagination.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getInfluencerCoupons('influencer-123', mockRequest, 1, 10, undefined, 'inactive');

      expect(couponService.findByInfluencerWithPagination).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
        1,
        10,
        undefined,
        'inactive',
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return all coupons when status is all', async () => {
      couponService.findByInfluencerWithPagination.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getInfluencerCoupons('influencer-123', mockRequest, 1, 10, undefined, 'all');

      expect(couponService.findByInfluencerWithPagination).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
        1,
        10,
        undefined,
        'all',
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return coupons with both search and status filters', async () => {
      couponService.findByInfluencerWithPagination.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.getInfluencerCoupons('influencer-123', mockRequest, 1, 10, 'desconto', 'active');

      expect(couponService.findByInfluencerWithPagination).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
        1,
        10,
        'desconto',
        'active',
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle errors when fetching coupons', async () => {
      const error = new Error('Failed to fetch coupons by influencer');
      couponService.findByInfluencerWithPagination.mockRejectedValue(error);

      await expect(controller.getInfluencerCoupons('influencer-123', mockRequest)).rejects.toThrow('Failed to fetch coupons by influencer');
      expect(couponService.findByInfluencerWithPagination).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
        1,
        10,
        undefined,
        undefined,
      );
    });

    it('should handle BadRequestException when influencer not found', async () => {
      const error = new Error('Influencer not found or does not belong to this store');
      couponService.findByInfluencerWithPagination.mockRejectedValue(error);

      await expect(controller.getInfluencerCoupons('influencer-123', mockRequest)).rejects.toThrow('Influencer not found or does not belong to this store');
      expect(couponService.findByInfluencerWithPagination).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
        1,
        10,
        undefined,
        undefined,
      );
    });
  });

  describe('remove', () => {
    it('should remove an influencer successfully', async () => {
      influencerService.remove.mockResolvedValue(mockInfluencer);

      const result = await controller.remove('influencer-123', mockRequest);

      expect(influencerService.remove).toHaveBeenCalledWith('influencer-123', 'store-123');
      expect(result).toEqual(mockInfluencer);
    });

    it('should handle removal errors', async () => {
      const error = new Error('Failed to remove influencer');
      influencerService.remove.mockRejectedValue(error);

      await expect(controller.remove('influencer-123', mockRequest)).rejects.toThrow('Failed to remove influencer');
      expect(influencerService.remove).toHaveBeenCalledWith('influencer-123', 'store-123');
    });
  });
});
