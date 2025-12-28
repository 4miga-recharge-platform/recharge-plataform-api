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

  const mockSalesHistory = [
    {
      id: 'sales-123',
      influencerId: 'influencer-123',
      month: 12,
      year: 2024,
      totalSales: 1500.5,
      createdAt: new Date('2024-12-01T00:00:00.000Z'),
      updatedAt: new Date('2024-12-01T00:00:00.000Z'),
    },
    {
      id: 'sales-124',
      influencerId: 'influencer-123',
      month: 11,
      year: 2024,
      totalSales: 1200.75,
      createdAt: new Date('2024-11-01T00:00:00.000Z'),
      updatedAt: new Date('2024-11-01T00:00:00.000Z'),
    },
  ];

  const mockInfluencerSelectBasic = {
    id: true,
    name: true,
    email: true,
    phone: true,
    paymentMethod: true,
    paymentData: true,
    isActive: true,
    storeId: true,
    coupons: false,
    monthlySales: false,
    createdAt: true,
    updatedAt: true,
  };

  const mockInfluencerSelectComplete = {
    id: true,
    name: true,
    email: true,
    phone: true,
    paymentMethod: true,
    paymentData: true,
    isActive: true,
    storeId: true,
    coupons: true,
    monthlySales: true,
    createdAt: true,
    updatedAt: true,
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
        count: jest.fn(),
      },
      store: {
        findUnique: jest.fn(),
      },
      coupon: {
        findMany: jest.fn(),
      },
      influencerMonthlySales: {
        findMany: jest.fn(),
        count: jest.fn(),
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

  describe('findByStore', () => {
    it('should return influencers by store with pagination successfully', async () => {
      const influencers = [mockInfluencer];
      const totalInfluencers = 1;

      prismaService.influencer.findMany.mockResolvedValue(influencers);
      prismaService.influencer.count.mockResolvedValue(totalInfluencers);

      const result = await service.findByStore('store-123');

      expect(prismaService.influencer.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-123' },
        select: mockInfluencerSelectBasic,
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(prismaService.influencer.count).toHaveBeenCalledWith({
        where: { storeId: 'store-123' },
      });
      expect(result).toEqual({
        data: influencers,
        totalInfluencers,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return influencers by store with custom pagination parameters', async () => {
      const influencers = [mockInfluencer];
      const totalInfluencers = 15;

      prismaService.influencer.findMany.mockResolvedValue(influencers);
      prismaService.influencer.count.mockResolvedValue(totalInfluencers);

      const result = await service.findByStore('store-123', 2, 5);

      expect(prismaService.influencer.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-123' },
        select: mockInfluencerSelectBasic,
        orderBy: {
          createdAt: 'desc',
        },
        skip: 5,
        take: 5,
      });
      expect(prismaService.influencer.count).toHaveBeenCalledWith({
        where: { storeId: 'store-123' },
      });
      expect(result).toEqual({
        data: influencers,
        totalInfluencers,
        page: 2,
        totalPages: 3,
      });
    });

    it('should return influencers with search filter', async () => {
      const influencers = [mockInfluencer];
      const totalInfluencers = 1;

      prismaService.influencer.findMany.mockResolvedValue(influencers);
      prismaService.influencer.count.mockResolvedValue(totalInfluencers);

      const result = await service.findByStore('store-123', 1, 10, 'joão');

      expect(prismaService.influencer.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          OR: [
            { name: { contains: 'joão', mode: 'insensitive' } },
            { email: { contains: 'joão', mode: 'insensitive' } },
          ],
        },
        select: mockInfluencerSelectBasic,
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(prismaService.influencer.count).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          OR: [
            { name: { contains: 'joão', mode: 'insensitive' } },
            { email: { contains: 'joão', mode: 'insensitive' } },
          ],
        },
      });
      expect(result).toEqual({
        data: influencers,
        totalInfluencers,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return influencers with active status filter', async () => {
      const influencers = [mockInfluencer];
      const totalInfluencers = 1;

      prismaService.influencer.findMany.mockResolvedValue(influencers);
      prismaService.influencer.count.mockResolvedValue(totalInfluencers);

      const result = await service.findByStore(
        'store-123',
        1,
        10,
        undefined,
        true,
      );

      expect(prismaService.influencer.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          isActive: true,
        },
        select: mockInfluencerSelectBasic,
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(prismaService.influencer.count).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          isActive: true,
        },
      });
      expect(result).toEqual({
        data: influencers,
        totalInfluencers,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return influencers with inactive status filter', async () => {
      const influencers = [mockInfluencer];
      const totalInfluencers = 1;

      prismaService.influencer.findMany.mockResolvedValue(influencers);
      prismaService.influencer.count.mockResolvedValue(totalInfluencers);

      const result = await service.findByStore(
        'store-123',
        1,
        10,
        undefined,
        false,
      );

      expect(prismaService.influencer.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          isActive: false,
        },
        select: mockInfluencerSelectBasic,
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(prismaService.influencer.count).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
          isActive: false,
        },
      });
      expect(result).toEqual({
        data: influencers,
        totalInfluencers,
        page: 1,
        totalPages: 1,
      });
    });

    it('should return all influencers when no status filter is applied', async () => {
      const influencers = [mockInfluencer];
      const totalInfluencers = 1;

      prismaService.influencer.findMany.mockResolvedValue(influencers);
      prismaService.influencer.count.mockResolvedValue(totalInfluencers);

      const result = await service.findByStore(
        'store-123',
        1,
        10,
        undefined,
        undefined,
      );

      expect(prismaService.influencer.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-123' },
        select: mockInfluencerSelectBasic,
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: influencers,
        totalInfluencers,
        page: 1,
        totalPages: 1,
      });
    });

    it('should handle errors', async () => {
      prismaService.influencer.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findByStore('store-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return an influencer by id successfully', async () => {
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);

      const result = await service.findOne('influencer-123', 'store-123');

      // Get current date to calculate expected month/year filters (current + 2 previous)
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const months: { month: number; year: number }[] = [];
      for (let i = 0; i < 3; i++) {
        const month = currentMonth - i;
        const year = currentYear;

        if (month <= 0) {
          months.push({ month: month + 12, year: year - 1 });
        } else {
          months.push({ month, year });
        }
      }

      expect(prismaService.influencer.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'influencer-123',
          storeId: 'store-123',
        },
        select: {
          ...mockInfluencerSelectComplete,
          coupons: {
            where: {
              deletedAt: null,
            },
          },
          monthlySales: {
            where: {
              OR: months.map(({ month, year }) => ({ month, year })),
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
          },
        },
      });
      expect(result).toEqual(mockInfluencer);
    });

    it('should throw BadRequestException when influencer not found', async () => {
      prismaService.influencer.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('influencer-123', 'store-123'),
      ).rejects.toThrow(BadRequestException);

      // Get current date to calculate expected month/year filters (current + 2 previous)
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const months: { month: number; year: number }[] = [];
      for (let i = 0; i < 3; i++) {
        const month = currentMonth - i;
        const year = currentYear;

        if (month <= 0) {
          months.push({ month: month + 12, year: year - 1 });
        } else {
          months.push({ month, year });
        }
      }

      expect(prismaService.influencer.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'influencer-123',
          storeId: 'store-123',
        },
        select: {
          ...mockInfluencerSelectComplete,
          coupons: {
            where: {
              deletedAt: null,
            },
          },
          monthlySales: {
            where: {
              OR: months.map(({ month, year }) => ({ month, year })),
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
          },
        },
      });
    });

    it('should handle errors', async () => {
      prismaService.influencer.findFirst.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.findOne('influencer-123', 'store-123'),
      ).rejects.toThrow(BadRequestException);
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
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(null);
      prismaService.influencer.create.mockResolvedValue(mockInfluencer);

      const result = await service.create(createInfluencerDto, 'store-123');

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
        data: {
          ...createInfluencerDto,
          storeId: 'store-123',
          isActive: true,
        },
        select: mockInfluencerSelectBasic,
      });
      expect(result).toEqual(mockInfluencer);
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createInfluencerDto, 'store-123'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaService.store.findUnique).toHaveBeenCalledWith({
        where: { id: 'store-123' },
      });
    });

    it('should throw BadRequestException when influencer name already exists for store', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);

      await expect(
        service.create(createInfluencerDto, 'store-123'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaService.influencer.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'João Silva',
          storeId: 'store-123',
        },
      });
    });

    it('should handle errors', async () => {
      prismaService.store.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.create(createInfluencerDto, 'store-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set isActive to true by default when not provided', async () => {
      const dtoWithoutIsActive = {
        name: 'João Silva',
        paymentMethod: 'pix',
        paymentData: 'PIX_JOAO123',
      };

      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.influencer.findFirst.mockResolvedValue(null);
      prismaService.influencer.create.mockResolvedValue(mockInfluencer);

      const result = await service.create(dtoWithoutIsActive, 'store-123');

      expect(prismaService.influencer.create).toHaveBeenCalledWith({
        data: {
          ...dtoWithoutIsActive,
          storeId: 'store-123',
          isActive: true,
        },
        select: mockInfluencerSelectBasic,
      });
      expect(result).toEqual(mockInfluencer);
    });
  });

  describe('update', () => {
    const updateInfluencerDto: UpdateInfluencerDto = {
      name: 'João Silva Atualizado',
      email: 'joao.novo@exemplo.com',
    };

    it('should update an influencer successfully', async () => {
      // Primeira chamada: verificar se o influencer existe
      prismaService.influencer.findFirst
        .mockResolvedValueOnce(mockInfluencer)
        // Segunda chamada: verificar se o nome já existe
        .mockResolvedValueOnce(null);

      prismaService.influencer.update.mockResolvedValue({
        ...mockInfluencer,
        ...updateInfluencerDto,
      });

      const result = await service.update(
        'influencer-123',
        updateInfluencerDto,
        'store-123',
      );

      expect(prismaService.influencer.update).toHaveBeenCalledWith({
        where: { id: 'influencer-123' },
        data: updateInfluencerDto,
        select: mockInfluencerSelectBasic,
      });
      expect(result).toEqual({
        ...mockInfluencer,
        ...updateInfluencerDto,
      });
    });

    it('should throw BadRequestException when influencer not found', async () => {
      prismaService.influencer.findFirst.mockResolvedValue(null);

      await expect(
        service.update('influencer-123', updateInfluencerDto, 'store-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new name already exists for store', async () => {
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);

      await expect(
        service.update('influencer-123', updateInfluencerDto, 'store-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle errors', async () => {
      prismaService.influencer.findFirst.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.update('influencer-123', updateInfluencerDto, 'store-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove an influencer successfully', async () => {
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findMany.mockResolvedValue([]);
      prismaService.influencer.delete.mockResolvedValue(mockInfluencer);

      const result = await service.remove('influencer-123', 'store-123');

      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: { influencerId: 'influencer-123', deletedAt: null },
      });
      expect(prismaService.influencer.delete).toHaveBeenCalledWith({
        where: { id: 'influencer-123' },
      });
      expect(result).toEqual(mockInfluencer);
    });

    it('should throw BadRequestException when influencer not found', async () => {
      prismaService.influencer.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('influencer-123', 'store-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when influencer has associated coupons', async () => {
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.coupon.findMany.mockResolvedValue([{ id: 'coupon-123' }]);

      await expect(
        service.remove('influencer-123', 'store-123'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaService.coupon.findMany).toHaveBeenCalledWith({
        where: { influencerId: 'influencer-123', deletedAt: null },
      });
    });

    it('should handle errors', async () => {
      prismaService.influencer.findFirst.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.remove('influencer-123', 'store-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllByStoreSimple', () => {
    it('should return all influencers with only id and name successfully', async () => {
      const mockSimpleInfluencers = [
        { id: 'influencer-123', name: 'João Silva' },
        { id: 'influencer-456', name: 'Maria Santos' },
        { id: 'influencer-789', name: 'Pedro Costa' },
      ];

      prismaService.influencer.findMany.mockResolvedValue(
        mockSimpleInfluencers,
      );

      const result = await service.findAllByStoreSimple('store-123');

      expect(prismaService.influencer.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
      expect(result).toEqual(mockSimpleInfluencers);
    });

    it('should return empty array when no influencers found', async () => {
      prismaService.influencer.findMany.mockResolvedValue([]);

      const result = await service.findAllByStoreSimple('store-123');

      expect(prismaService.influencer.findMany).toHaveBeenCalledWith({
        where: {
          storeId: 'store-123',
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      prismaService.influencer.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAllByStoreSimple('store-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getSalesHistory', () => {
    it('should return sales history with pagination successfully', async () => {
      // Mock findOne to verify influencer exists
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.influencerMonthlySales.findMany.mockResolvedValue(
        mockSalesHistory,
      );
      prismaService.influencerMonthlySales.count.mockResolvedValue(2);

      const result = await service.getSalesHistory(
        'influencer-123',
        'store-123',
      );

      expect(
        prismaService.influencerMonthlySales.findMany,
      ).toHaveBeenCalledWith({
        where: { influencerId: 'influencer-123' },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: 0,
        take: 10,
      });
      expect(prismaService.influencerMonthlySales.count).toHaveBeenCalledWith({
        where: { influencerId: 'influencer-123' },
      });
      expect(result).toEqual({
        data: mockSalesHistory,
        totalSales: 2,
        page: 1,
        totalPages: 1,
        influencerName: mockInfluencer.name,
      });
    });

    it('should return sales history with custom pagination parameters', async () => {
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.influencerMonthlySales.findMany.mockResolvedValue(
        mockSalesHistory,
      );
      prismaService.influencerMonthlySales.count.mockResolvedValue(15);

      const result = await service.getSalesHistory(
        'influencer-123',
        'store-123',
        2,
        5,
      );

      expect(
        prismaService.influencerMonthlySales.findMany,
      ).toHaveBeenCalledWith({
        where: { influencerId: 'influencer-123' },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: 5,
        take: 5,
      });
      expect(result).toEqual({
        data: mockSalesHistory,
        totalSales: 15,
        page: 2,
        totalPages: 3,
        influencerName: mockInfluencer.name,
      });
    });

    it('should return sales history with year filter', async () => {
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.influencerMonthlySales.findMany.mockResolvedValue(
        mockSalesHistory,
      );
      prismaService.influencerMonthlySales.count.mockResolvedValue(2);

      await service.getSalesHistory('influencer-123', 'store-123', 1, 10, 2024);

      expect(
        prismaService.influencerMonthlySales.findMany,
      ).toHaveBeenCalledWith({
        where: {
          influencerId: 'influencer-123',
          year: 2024,
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: 0,
        take: 10,
      });
      expect(prismaService.influencerMonthlySales.count).toHaveBeenCalledWith({
        where: {
          influencerId: 'influencer-123',
          year: 2024,
        },
      });
    });

    it('should return sales history with month filter', async () => {
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.influencerMonthlySales.findMany.mockResolvedValue([
        mockSalesHistory[0],
      ]);
      prismaService.influencerMonthlySales.count.mockResolvedValue(1);

      await service.getSalesHistory(
        'influencer-123',
        'store-123',
        1,
        10,
        undefined,
        12,
      );

      expect(
        prismaService.influencerMonthlySales.findMany,
      ).toHaveBeenCalledWith({
        where: {
          influencerId: 'influencer-123',
          month: 12,
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: 0,
        take: 10,
      });
    });

    it('should return sales history with both year and month filters', async () => {
      prismaService.influencer.findFirst.mockResolvedValue(mockInfluencer);
      prismaService.influencerMonthlySales.findMany.mockResolvedValue([
        mockSalesHistory[0],
      ]);
      prismaService.influencerMonthlySales.count.mockResolvedValue(1);

      await service.getSalesHistory(
        'influencer-123',
        'store-123',
        1,
        10,
        2024,
        12,
      );

      expect(
        prismaService.influencerMonthlySales.findMany,
      ).toHaveBeenCalledWith({
        where: {
          influencerId: 'influencer-123',
          year: 2024,
          month: 12,
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: 0,
        take: 10,
      });
    });

    it('should throw BadRequestException when influencer not found', async () => {
      prismaService.influencer.findFirst.mockResolvedValue(null);

      await expect(
        service.getSalesHistory('influencer-123', 'store-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle errors', async () => {
      prismaService.influencer.findFirst.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.getSalesHistory('influencer-123', 'store-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
