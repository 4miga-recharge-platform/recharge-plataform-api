import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InfluencerService } from '../influencer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInfluencerDto } from '../dto/create-influencer.dto';
import { UpdateInfluencerDto } from '../dto/update-influencer.dto';

// Mock validation utility
jest.mock('../../utils/validation.util', () => ({
  validateRequiredFields: jest.fn(),
}));

describe('InfluencerService', () => {
  let service: InfluencerService;
  let prismaService: any;

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

  const mockStore = {
    id: 'store-123',
    name: 'Loja Exemplo',
    email: 'loja@exemplo.com',
  };

  const mockInfluencerSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    paymentMethod: true,
    paymentData: true,
    isActive: true,
    storeId: true,
    coupons: true,
    createdAt: false,
    updatedAt: false,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      influencer: {
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
      coupon: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InfluencerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InfluencerService>(InfluencerService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all influencers successfully', async () => {
      const influencers = [mockInfluencer];
      prismaService.influencer.findMany.mockResolvedValue(influencers);

      const result = await service.findAll();

      expect(prismaService.influencer.findMany).toHaveBeenCalledWith({
        select: mockInfluencerSelect,
      });
      expect(result).toEqual(influencers);
    });

    it('should handle errors', async () => {
      prismaService.influencer.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll()).rejects.toThrow(BadRequestException);
      expect(prismaService.influencer.findMany).toHaveBeenCalledWith({
        select: mockInfluencerSelect,
      });
    });
  });

  describe('findOne', () => {
    it('should return an influencer by id successfully', async () => {
      prismaService.influencer.findUnique.mockResolvedValue(mockInfluencer);

      const result = await service.findOne('influencer-123');

      expect(prismaService.influencer.findUnique).toHaveBeenCalledWith({
        where: { id: 'influencer-123' },
        select: mockInfluencerSelect,
      });
      expect(result).toEqual(mockInfluencer);
    });

    it('should throw BadRequestException when influencer not found', async () => {
      prismaService.influencer.findUnique.mockResolvedValue(null);

      await expect(service.findOne('influencer-123')).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.influencer.findUnique).toHaveBeenCalledWith({
        where: { id: 'influencer-123' },
        select: mockInfluencerSelect,
      });
    });

    it('should handle errors', async () => {
      prismaService.influencer.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne('influencer-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByStore', () => {
    it('should return influencers by store successfully', async () => {
      const influencers = [mockInfluencer];
      prismaService.influencer.findMany.mockResolvedValue(influencers);

      const result = await service.findByStore('store-123');

      expect(prismaService.influencer.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-123' },
        select: mockInfluencerSelect,
      });
      expect(result).toEqual(influencers);
    });

    it('should handle errors', async () => {
      prismaService.influencer.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.findByStore('store-123')).rejects.toThrow(BadRequestException);
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
      storeId: 'store-123',
    };

    it('should create an influencer successfully', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(null);
      prismaService.influencer.create.mockResolvedValue(mockInfluencer);

      const result = await service.create(createInfluencerDto);

      expect(prismaService.store.findUnique).toHaveBeenCalledWith({
        where: { id: 'store-123' },
      });
      expect(prismaService.influencer.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'João Silva',
          storeId: 'store-123',
        },
      });
      expect(prismaService.influencer.create).toHaveBeenCalledWith({
        data: createInfluencerDto,
        select: mockInfluencerSelect,
      });
      expect(result).toEqual(mockInfluencer);
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.create(createInfluencerDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.store.findUnique).toHaveBeenCalledWith({
        where: { id: 'store-123' },
      });
    });

    it('should throw BadRequestException when influencer name already exists for store', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);

      await expect(service.create(createInfluencerDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.influencer.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'João Silva',
          storeId: 'store-123',
        },
      });
    });

    it('should handle errors', async () => {
      prismaService.store.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createInfluencerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateInfluencerDto: UpdateInfluencerDto = {
      name: 'João Silva Atualizado',
      email: 'joao.novo@exemplo.com',
    };

    it('should update an influencer successfully', async () => {
      prismaService.influencer.findUnique.mockResolvedValue(mockInfluencer);
      prismaService.influencer.findFirst.mockResolvedValue(null);
      prismaService.influencer.update.mockResolvedValue({
        ...mockInfluencer,
        ...updateInfluencerDto,
      });

      const result = await service.update('influencer-123', updateInfluencerDto);

      expect(prismaService.influencer.update).toHaveBeenCalledWith({
        where: { id: 'influencer-123' },
        data: updateInfluencerDto,
        select: mockInfluencerSelect,
      });
      expect(result).toEqual({
        ...mockInfluencer,
        ...updateInfluencerDto,
      });
    });

    it('should throw BadRequestException when influencer not found', async () => {
      prismaService.influencer.findUnique.mockResolvedValue(null);

      await expect(service.update('influencer-123', updateInfluencerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when new name already exists for store', async () => {
      prismaService.influencer.findUnique.mockResolvedValue(mockInfluencer);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);

      await expect(service.update('influencer-123', updateInfluencerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle errors', async () => {
      prismaService.influencer.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.update('influencer-123', updateInfluencerDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove an influencer successfully', async () => {
      prismaService.influencer.findUnique.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findMany.mockResolvedValue([]);
      prismaService.influencer.delete.mockResolvedValue(mockInfluencer);

      const result = await service.remove('influencer-123');

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: { influencerId: 'influencer-123' },
      });
      expect(prismaService.influencer.delete).toHaveBeenCalledWith({
        where: { id: 'influencer-123' },
        select: mockInfluencerSelect,
      });
      expect(result).toEqual(mockInfluencer);
    });

    it('should throw BadRequestException when influencer not found', async () => {
      prismaService.influencer.findUnique.mockResolvedValue(null);

      await expect(service.remove('influencer-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when influencer has associated coupons', async () => {
      prismaService.influencer.findUnique.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findMany.mockResolvedValue([{ id: 'coupon-123' }]);

      await expect(service.remove('influencer-123')).rejects.toThrow(BadRequestException);
      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: { influencerId: 'influencer-123' },
      });
    });

    it('should handle errors', async () => {
      prismaService.influencer.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.remove('influencer-123')).rejects.toThrow(BadRequestException);
    });
  });
});
