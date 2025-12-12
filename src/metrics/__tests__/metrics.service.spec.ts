import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MetricsService } from '../metrics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../../order/order.service';
import { OrderStatus } from '@prisma/client';

describe('MetricsService', () => {
  let service: MetricsService;
  let prismaService: PrismaService;

  const mockStore = {
    id: 'store-123',
    name: 'Test Store',
    email: 'store@example.com',
    domain: 'https://example.com',
    wppNumber: '+5511999999999',
    instagramUrl: 'https://instagram.com/test',
    facebookUrl: null,
    tiktokUrl: null,
    logoUrl: null,
    miniLogoUrl: null,
    faviconUrl: null,
    bannersUrl: [],
    secondaryBannerUrl: null,
    braviveApiToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStoreSelect = {
    id: true,
    name: true,
    email: true,
    domain: true,
    wppNumber: true,
    instagramUrl: true,
    facebookUrl: true,
    tiktokUrl: true,
    logoUrl: true,
    miniLogoUrl: true,
    faviconUrl: true,
    bannersUrl: true,
    secondaryBannerUrl: true,
    braviveApiToken: false,
    createdAt: false,
    updatedAt: false,
    users: false,
    packages: false,
    orders: false,
  };

  const mockPrismaService = {
    store: {
      findUnique: jest.fn(),
    },
    storeMonthlySales: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    storeMonthlySalesByProduct: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    storeDailySales: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    storeProductSettings: {
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
    },
  };

  const mockOrderService = {
    checkAndExpireOrders: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardData', () => {
    const storeId = 'store-123';
    const mockMonthlySales = {
      id: 'monthly-sales-123',
      storeId,
      month: 1,
      year: 2024,
      totalSales: 50000.0,
      totalOrders: 150,
      totalCompletedOrders: 140,
      totalExpiredOrders: 5,
      totalRefundedOrders: 5,
      newCustomers: 30,
      ordersWithCoupon: 80,
      ordersWithoutCoupon: 70,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockSalesByProduct = [
      {
        id: 'sales-by-product-1',
        storeId,
        productId: 'prod-123',
        month: 1,
        year: 2024,
        totalSales: 30000.0,
        totalOrders: 90,
        product: {
          id: 'prod-123',
          name: 'Bigo Live Coins',
          imgCardUrl: 'https://example.com/product/prod-123/card.png',
        },
      },
      {
        id: 'sales-by-product-2',
        storeId,
        productId: 'prod-456',
        month: 1,
        year: 2024,
        totalSales: 20000.0,
        totalOrders: 60,
        product: {
          id: 'prod-456',
          name: 'Free Fire Diamonds',
          imgCardUrl: 'https://example.com/product/prod-456/card.png',
        },
      },
    ];

    const mockDailySales = [
      {
        id: 'daily-sales-1',
        storeId,
        date: new Date('2024-01-15'),
        totalSales: 2500.0,
        totalOrders: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'daily-sales-2',
        storeId,
        date: new Date('2024-01-14'),
        totalSales: 2300.5,
        totalOrders: 18,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    beforeEach(() => {
      mockPrismaService.store.findUnique.mockResolvedValue(mockStore);
    });

    it('should return dashboard data successfully with current_month period', async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      mockPrismaService.storeMonthlySales.findFirst
        .mockResolvedValueOnce({
          ...mockMonthlySales,
          year: currentYear,
          month: currentMonth,
        })
        .mockResolvedValueOnce({
          year: 2023,
          month: 1,
        });
      mockPrismaService.storeMonthlySalesByProduct.findMany.mockResolvedValue([
        {
          ...mockSalesByProduct[0],
          year: currentYear,
          month: currentMonth,
        },
      ]);
      mockPrismaService.storeDailySales.findMany.mockResolvedValue(
        mockDailySales,
      );
      mockPrismaService.storeProductSettings.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(100);

      const result = await service.getDashboardData(storeId);

      expect(mockPrismaService.store.findUnique).toHaveBeenCalledWith({
        where: { id: storeId },
        select: { id: true },
      });

      expect(result.period.type).toBe('current_month');
      expect(result.summary.totalSales).toBe(50000.0);
      expect(result.summary.totalOrders).toBe(150);
      expect(result.summary.averageTicket).toBeCloseTo(357.14, 2);
      expect(result.dailyTrend).toHaveLength(2);
      expect(result.salesByProduct).toHaveLength(1);
    });

    it('should return dashboard data successfully with custom month period', async () => {
      const year = 2024;
      const month = 1;

      mockPrismaService.storeMonthlySales.findFirst
        .mockResolvedValueOnce({
          ...mockMonthlySales,
          year,
          month,
        })
        .mockResolvedValueOnce({
          year: 2023,
          month: 1,
        });
      mockPrismaService.storeMonthlySalesByProduct.findMany.mockResolvedValue(
        mockSalesByProduct,
      );
      mockPrismaService.storeDailySales.findMany.mockResolvedValue(
        mockDailySales,
      );
      mockPrismaService.storeProductSettings.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(100);

      const result = await service.getDashboardData(storeId, '2024-01');

      expect(result.period.type).toBe('2024-01');
      expect(result.period.year).toBe(year);
      expect(result.period.month).toBe(month);
      expect(result.summary.totalSales).toBe(50000.0);
      expect(result.salesByProduct).toHaveLength(2);
      expect(result.salesByProduct[0].percentage).toBeCloseTo(60.0, 2);
    });

    it('should return zero values when no monthly sales data exists', async () => {
      mockPrismaService.storeMonthlySales.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockPrismaService.storeMonthlySalesByProduct.findMany.mockResolvedValue(
        [],
      );
      mockPrismaService.storeDailySales.findMany.mockResolvedValue(
        mockDailySales,
      );
      mockPrismaService.storeProductSettings.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(100);

      const result = await service.getDashboardData(storeId);

      expect(result.summary.totalSales).toBe(0);
      expect(result.summary.totalOrders).toBe(0);
      expect(result.summary.averageTicket).toBe(0);
      expect(result.salesByProduct).toHaveLength(0);
      expect(result.firstAvailablePeriod).toBeNull();
    });

    it('should throw BadRequestException for invalid period format', async () => {
      await expect(
        service.getDashboardData(storeId, 'invalid-period'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when store not found', async () => {
      mockPrismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.getDashboardData(storeId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('recalculateStoreMetrics', () => {
    const storeId = 'store-123';
    const targetDate = new Date('2024-01-15');

    it('should recalculate metrics for a specific date', async () => {
      // Mock for daily metrics (recalculateDailyMetrics)
      const mockDailyOrders = [
        {
          id: 'order-1',
          price: 100.0,
          orderStatus: OrderStatus.COMPLETED,
          createdAt: targetDate,
        },
        {
          id: 'order-2',
          price: 50.0,
          orderStatus: OrderStatus.COMPLETED,
          createdAt: targetDate,
        },
      ];

      // Mock for monthly metrics (recalculateMonthlyMetrics)
      const mockMonthlyOrders = [
        {
          id: 'order-1',
          price: 100.0,
          orderStatus: OrderStatus.COMPLETED,
          createdAt: targetDate,
          couponUsages: [],
        },
        {
          id: 'order-2',
          price: 50.0,
          orderStatus: OrderStatus.COMPLETED,
          createdAt: targetDate,
          couponUsages: [],
        },
      ];

      // Mock for monthly by product metrics (recalculateMonthlyByProductMetrics)
      const mockMonthlyByProductOrders = [
        {
          id: 'order-1',
          price: 100.0,
          orderStatus: OrderStatus.COMPLETED,
          createdAt: targetDate,
          orderItem: {
            productId: 'prod-123',
          },
        },
        {
          id: 'order-2',
          price: 50.0,
          orderStatus: OrderStatus.COMPLETED,
          createdAt: targetDate,
          orderItem: {
            productId: 'prod-123',
          },
        },
      ];

      // Mock findMany to return different data for different queries
      mockPrismaService.order.findMany
        .mockResolvedValueOnce(mockDailyOrders) // For daily metrics
        .mockResolvedValueOnce(mockMonthlyOrders) // For monthly metrics
        .mockResolvedValueOnce(mockMonthlyByProductOrders); // For monthly by product metrics
      mockPrismaService.storeDailySales.upsert.mockResolvedValue({});
      mockPrismaService.storeMonthlySales.upsert.mockResolvedValue({});
      mockPrismaService.storeMonthlySalesByProduct.upsert.mockResolvedValue({});
      mockPrismaService.user.count.mockResolvedValue(10);

      await service.recalculateStoreMetrics(storeId, targetDate);

      expect(mockOrderService.checkAndExpireOrders).toHaveBeenCalledWith(
        storeId,
        undefined,
        expect.any(Date),
      );
      expect(mockPrismaService.order.findMany).toHaveBeenCalledTimes(3);
      expect(mockPrismaService.storeDailySales.upsert).toHaveBeenCalled();
      expect(mockPrismaService.storeMonthlySales.upsert).toHaveBeenCalled();
      expect(mockPrismaService.storeMonthlySalesByProduct.upsert).toHaveBeenCalled();
    });
  });
});

