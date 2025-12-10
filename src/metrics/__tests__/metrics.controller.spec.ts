import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MetricsController } from '../metrics.controller';
import { MetricsService } from '../metrics.service';
import { MetricsCronService } from '../metrics-cron.service';
import { User } from '../../user/entities/user.entity';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: MetricsService;
  let metricsCronService: MetricsCronService;

  const mockUser: User = {
    id: 'user-123',
    storeId: 'store-123',
    email: 'test@example.com',
    name: 'Test User',
    phone: '+5511999999999',
    password: 'hashed-password',
    documentType: 'cpf',
    documentValue: '12345678901',
    role: 'RESELLER_ADMIN_4MIGA_USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDashboardData = {
    period: {
      type: 'current_month',
      year: 2024,
      month: 1,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    },
    summary: {
      totalSales: 50000.0,
      totalOrders: 150,
      totalCompletedOrders: 140,
      totalExpiredOrders: 5,
      totalRefundedOrders: 5,
      averageTicket: 357.14,
      totalCustomers: 120,
      newCustomers: 30,
      ordersWithCoupon: 80,
      ordersWithoutCoupon: 70,
    },
    dailyTrend: [
      {
        date: '2024-01-15',
        totalSales: 2500.0,
        totalOrders: 20,
      },
    ],
    salesByProduct: [
      {
        productId: 'prod-123',
        productName: 'Bigo Live Coins',
        imgCardUrl: 'https://example.com/product/prod-123/card.png',
        totalSales: 30000.0,
        totalOrders: 90,
        percentage: 60.0,
      },
    ],
    firstAvailablePeriod: {
      year: 2023,
      month: 1,
      period: '2023-01',
    },
    cronHealthStatus: 'OK' as const,
  };

  const mockMetricsService = {
    getDashboardData: jest.fn(),
    recalculateStoreMetrics: jest.fn(),
  };

  const mockMetricsCronService = {
    getCronHealthStatus: jest.fn(),
    getFailedExecutionsInMonth: jest.fn(),
    updateExecutionStatusToSuccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: MetricsCronService,
          useValue: mockMetricsCronService,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    metricsService = module.get<MetricsService>(MetricsService);
    metricsCronService = module.get<MetricsCronService>(MetricsCronService);

    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return dashboard data successfully with default period', async () => {
      mockMetricsService.getDashboardData.mockResolvedValue(mockDashboardData);
      mockMetricsCronService.getCronHealthStatus.mockResolvedValue('OK');

      const result = await controller.getDashboard(mockUser);

      expect(metricsService.getDashboardData).toHaveBeenCalledWith(
        mockUser.storeId,
        undefined,
      );
      expect(metricsCronService.getCronHealthStatus).toHaveBeenCalled();
      expect(result).toEqual({
        ...mockDashboardData,
        cronHealthStatus: 'OK',
      });
    });

    it('should return dashboard data successfully with custom period', async () => {
      const period = '2024-01';
      mockMetricsService.getDashboardData.mockResolvedValue({
        ...mockDashboardData,
        period: {
          ...mockDashboardData.period,
          type: period,
        },
      });
      mockMetricsCronService.getCronHealthStatus.mockResolvedValue('OK');

      const result = await controller.getDashboard(mockUser, period);

      expect(metricsService.getDashboardData).toHaveBeenCalledWith(
        mockUser.storeId,
        period,
      );
      expect(result.cronHealthStatus).toBe('OK');
    });

    it('should throw BadRequestException when storeId not found in user data', async () => {
      const userWithoutStoreId = {
        ...mockUser,
        storeId: undefined,
      };

      await expect(
        controller.getDashboard(userWithoutStoreId as any),
      ).rejects.toThrow('Store ID not found in user data');
      expect(metricsService.getDashboardData).not.toHaveBeenCalled();
    });
  });

  describe('recalculateStoreMetrics', () => {
    it('should throw BadRequestException when cron health status is OK', async () => {
      mockMetricsCronService.getCronHealthStatus.mockResolvedValue('OK');

      await expect(
        controller.recalculateStoreMetrics(mockUser),
      ).rejects.toThrow(BadRequestException);
      expect(metricsCronService.getCronHealthStatus).toHaveBeenCalled();
    });

    it('should recalculate metrics for failed days in current month', async () => {
      const failedDates = [
        new Date('2024-01-15'),
        new Date('2024-01-20'),
      ];
      // First call returns WARNING (to allow recalculation), second call returns OK (after fix)
      mockMetricsCronService.getCronHealthStatus
        .mockResolvedValueOnce('WARNING')
        .mockResolvedValueOnce('OK');
      mockMetricsCronService.getFailedExecutionsInMonth.mockResolvedValue(
        failedDates,
      );
      mockMetricsService.recalculateStoreMetrics.mockResolvedValue(undefined);
      mockMetricsCronService.updateExecutionStatusToSuccess.mockResolvedValue(
        undefined,
      );
      mockMetricsService.getDashboardData.mockResolvedValue(mockDashboardData);

      const result = await controller.recalculateStoreMetrics(mockUser);

      expect(metricsCronService.getFailedExecutionsInMonth).toHaveBeenCalled();
      expect(metricsService.recalculateStoreMetrics).toHaveBeenCalledTimes(2);
      expect(
        metricsCronService.updateExecutionStatusToSuccess,
      ).toHaveBeenCalledTimes(2);
      expect(result.fixedDates).toHaveLength(2);
      expect(result.fixedDates[0].status).toBe('SUCCESS');
    });

    it('should recalculate metrics for specific month when period is provided', async () => {
      const period = '2024-01';
      const failedDates = [new Date('2024-01-15')];
      // First call returns WARNING (to allow recalculation), second call returns OK (after fix)
      mockMetricsCronService.getCronHealthStatus
        .mockResolvedValueOnce('WARNING')
        .mockResolvedValueOnce('OK');
      mockMetricsCronService.getFailedExecutionsInMonth.mockResolvedValue(
        failedDates,
      );
      mockMetricsService.recalculateStoreMetrics.mockResolvedValue(undefined);
      mockMetricsCronService.updateExecutionStatusToSuccess.mockResolvedValue(
        undefined,
      );
      mockMetricsService.getDashboardData.mockResolvedValue({
        ...mockDashboardData,
        period: {
          ...mockDashboardData.period,
          type: period,
        },
      });

      const result = await controller.recalculateStoreMetrics(mockUser, period);

      expect(metricsCronService.getCronHealthStatus).toHaveBeenCalledWith(
        2024,
        1,
      );
      expect(result.fixedDates).toHaveLength(1);
    });

    it('should throw BadRequestException when no failed executions found', async () => {
      mockMetricsCronService.getCronHealthStatus.mockResolvedValue('WARNING');
      mockMetricsCronService.getFailedExecutionsInMonth.mockResolvedValue([]);

      await expect(
        controller.recalculateStoreMetrics(mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle errors during recalculation', async () => {
      const failedDates = [new Date('2024-01-15')];
      // First call returns WARNING (to allow recalculation), second call returns OK (after attempt)
      mockMetricsCronService.getCronHealthStatus
        .mockResolvedValueOnce('WARNING')
        .mockResolvedValueOnce('OK');
      mockMetricsCronService.getFailedExecutionsInMonth.mockResolvedValue(
        failedDates,
      );
      mockMetricsService.recalculateStoreMetrics.mockRejectedValue(
        new Error('Recalculation failed'),
      );
      mockMetricsService.getDashboardData.mockResolvedValue(mockDashboardData);

      const result = await controller.recalculateStoreMetrics(mockUser);

      expect(result.fixedDates).toHaveLength(1);
      expect(result.fixedDates[0].status).toBe('FAILED');
      expect(result.fixedDates[0].error).toBe('Recalculation failed');
    });
  });

  describe('refreshMetrics', () => {
    it('should refresh current day metrics and return dashboard data', async () => {
      mockMetricsService.recalculateStoreMetrics.mockResolvedValue(undefined);
      mockMetricsService.getDashboardData.mockResolvedValue(mockDashboardData);
      mockMetricsCronService.getCronHealthStatus.mockResolvedValue('OK');

      const result = await controller.refreshMetrics(mockUser);

      expect(metricsService.recalculateStoreMetrics).toHaveBeenCalled();
      // getDashboardData is called without period parameter (uses default 'current_month')
      expect(metricsService.getDashboardData).toHaveBeenCalledWith(
        mockUser.storeId,
      );
      expect(result).toEqual({
        ...mockDashboardData,
        cronHealthStatus: 'OK',
      });
    });

    it('should throw BadRequestException when storeId not found', async () => {
      const userWithoutStoreId = {
        ...mockUser,
        storeId: undefined,
      };

      await expect(
        controller.refreshMetrics(userWithoutStoreId as any),
      ).rejects.toThrow('Store ID not found in user data');
    });
  });
});

