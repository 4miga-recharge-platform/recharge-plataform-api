import { Test, TestingModule } from '@nestjs/testing';
import { CouponService } from '../../coupon/coupon.service';
import { CreateInfluencerDto } from '../dto/create-influencer.dto';
import { UpdateInfluencerDto } from '../dto/update-influencer.dto';
import { InfluencerController } from '../influencer.controller';
import { InfluencerService } from '../influencer.service';

describe('InfluencerController', () => {
  let controller: InfluencerController;
  let influencerService: any;

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
      findAllByStoreSimple: jest.fn(),
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
        totalPages: 1,
      };
      influencerService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest);

      expect(influencerService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        undefined,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return influencers with custom pagination parameters', async () => {
      const paginatedResponse = {
        data: [mockInfluencer],
        totalInfluencers: 1,
        page: 2,
        totalPages: 2,
      };
      influencerService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 2, 5);

      expect(influencerService.findByStore).toHaveBeenCalledWith(
        'store-123',
        2,
        5,
        undefined,
        undefined,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return influencers with search filter', async () => {
      const paginatedResponse = {
        data: [mockInfluencer],
        totalInfluencers: 1,
        page: 1,
        totalPages: 1,
      };
      influencerService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, 1, 10, 'joão');

      expect(influencerService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        'joão',
        undefined,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return influencers with active status filter', async () => {
      const paginatedResponse = {
        data: [mockInfluencer],
        totalInfluencers: 1,
        page: 1,
        totalPages: 1,
      };
      influencerService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(
        mockRequest,
        1,
        10,
        undefined,
        'active',
      );

      expect(influencerService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        true,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return influencers with inactive status filter', async () => {
      const paginatedResponse = {
        data: [mockInfluencer],
        totalInfluencers: 1,
        page: 1,
        totalPages: 1,
      };
      influencerService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(
        mockRequest,
        1,
        10,
        undefined,
        'inactive',
      );

      expect(influencerService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        false,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should return all influencers when status is all', async () => {
      const paginatedResponse = {
        data: [mockInfluencer],
        totalInfluencers: 1,
        page: 1,
        totalPages: 1,
      };
      influencerService.findByStore.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(
        mockRequest,
        1,
        10,
        undefined,
        'all',
      );

      expect(influencerService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        undefined,
      );
      expect(result).toEqual(paginatedResponse);
    });

    it('should handle errors when fetching influencers', async () => {
      const error = new Error('Failed to fetch influencers');
      influencerService.findByStore.mockRejectedValue(error);

      await expect(controller.findAll(mockRequest)).rejects.toThrow(
        'Failed to fetch influencers',
      );
      expect(influencerService.findByStore).toHaveBeenCalledWith(
        'store-123',
        1,
        10,
        undefined,
        undefined,
      );
    });
  });

  describe('findAllSimple', () => {
    it('should return all influencers with only id and name successfully', async () => {
      const mockSimpleInfluencers = [
        { id: 'influencer-123', name: 'João Silva' },
        { id: 'influencer-456', name: 'Maria Santos' },
        { id: 'influencer-789', name: 'Pedro Costa' },
      ];
      influencerService.findAllByStoreSimple.mockResolvedValue(
        mockSimpleInfluencers,
      );

      const result = await controller.findAllSimple(mockRequest);

      expect(influencerService.findAllByStoreSimple).toHaveBeenCalledWith(
        'store-123',
      );
      expect(result).toEqual(mockSimpleInfluencers);
    });

    it('should return empty array when no influencers found', async () => {
      influencerService.findAllByStoreSimple.mockResolvedValue([]);

      const result = await controller.findAllSimple(mockRequest);

      expect(influencerService.findAllByStoreSimple).toHaveBeenCalledWith(
        'store-123',
      );
      expect(result).toEqual([]);
    });

    it('should handle errors when fetching simple influencers list', async () => {
      const error = new Error('Failed to fetch influencers list');
      influencerService.findAllByStoreSimple.mockRejectedValue(error);

      await expect(controller.findAllSimple(mockRequest)).rejects.toThrow(
        'Failed to fetch influencers list',
      );
      expect(influencerService.findAllByStoreSimple).toHaveBeenCalledWith(
        'store-123',
      );
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

      expect(influencerService.create).toHaveBeenCalledWith(
        createInfluencerDto,
        'store-123',
      );
      expect(result).toEqual(mockInfluencer);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create influencer');
      influencerService.create.mockRejectedValue(error);

      await expect(
        controller.create(createInfluencerDto, mockRequest),
      ).rejects.toThrow('Failed to create influencer');
      expect(influencerService.create).toHaveBeenCalledWith(
        createInfluencerDto,
        'store-123',
      );
    });
  });

  describe('findOne', () => {
    it('should return an influencer by id successfully', async () => {
      influencerService.findOne.mockResolvedValue(mockInfluencer);

      const result = await controller.findOne('influencer-123', mockRequest);

      expect(influencerService.findOne).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
      );
      expect(result).toEqual(mockInfluencer);
    });

    it('should handle errors when fetching influencer by id', async () => {
      const error = new Error('Failed to fetch influencer');
      influencerService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne('influencer-123', mockRequest),
      ).rejects.toThrow('Failed to fetch influencer');
      expect(influencerService.findOne).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
      );
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

      const result = await controller.update(
        'influencer-123',
        updateInfluencerDto,
        mockRequest,
      );

      expect(influencerService.update).toHaveBeenCalledWith(
        'influencer-123',
        updateInfluencerDto,
        'store-123',
      );
      expect(result).toEqual(updatedInfluencer);
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update influencer');
      influencerService.update.mockRejectedValue(error);

      await expect(
        controller.update('influencer-123', updateInfluencerDto, mockRequest),
      ).rejects.toThrow('Failed to update influencer');
      expect(influencerService.update).toHaveBeenCalledWith(
        'influencer-123',
        updateInfluencerDto,
        'store-123',
      );
    });
  });

  describe('remove', () => {
    it('should remove an influencer successfully', async () => {
      influencerService.remove.mockResolvedValue(mockInfluencer);

      const result = await controller.remove('influencer-123', mockRequest);

      expect(influencerService.remove).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
      );
      expect(result).toEqual(mockInfluencer);
    });

    it('should handle removal errors', async () => {
      const error = new Error('Failed to remove influencer');
      influencerService.remove.mockRejectedValue(error);

      await expect(
        controller.remove('influencer-123', mockRequest),
      ).rejects.toThrow('Failed to remove influencer');
      expect(influencerService.remove).toHaveBeenCalledWith(
        'influencer-123',
        'store-123',
      );
    });
  });
});
