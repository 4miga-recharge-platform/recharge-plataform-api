import { Test, TestingModule } from '@nestjs/testing';
import { MetricsCronService } from '../metrics-cron.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../metrics.service';

describe('MetricsCronService', () => {
  let service: MetricsCronService;
  let prismaService: PrismaService;
  let metricsService: MetricsService;

  const mockPrismaService = {
    metricsCronExecution: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    store: {
      findMany: jest.fn(),
    },
  };

  const mockMetricsService = {
    recalculateStoreMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsCronService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<MetricsCronService>(MetricsCronService);
    prismaService = module.get<PrismaService>(PrismaService);
    metricsService = module.get<MetricsService>(MetricsService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCronHealthStatus', () => {
    it('should return OK when no failed executions exist', async () => {
      mockPrismaService.metricsCronExecution.findMany.mockResolvedValue([]);

      const result = await service.getCronHealthStatus(2024, 1);

      expect(result).toBe('OK');
      expect(mockPrismaService.metricsCronExecution.findMany).toHaveBeenCalled();
    });

    it('should return WARNING when failed or partial executions exist', async () => {
      mockPrismaService.metricsCronExecution.findMany.mockResolvedValue([
        { status: 'FAILED' },
        { status: 'PARTIAL' },
      ]);

      const result = await service.getCronHealthStatus(2024, 1);

      expect(result).toBe('WARNING');
    });

    it('should return ERROR when permanent failed executions exist', async () => {
      mockPrismaService.metricsCronExecution.findMany.mockResolvedValue([
        { status: 'FAILED_PERMANENT' },
      ]);

      const result = await service.getCronHealthStatus(2024, 1);

      expect(result).toBe('ERROR');
    });
  });

  describe('getFailedExecutionsInMonth', () => {
    it('should return failed execution dates for a month', async () => {
      const failedExecutions = [
        { executionDate: new Date('2024-01-15') },
        { executionDate: new Date('2024-01-20') },
      ];
      mockPrismaService.metricsCronExecution.findMany.mockResolvedValue(
        failedExecutions,
      );

      const result = await service.getFailedExecutionsInMonth(2024, 1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(new Date('2024-01-15'));
      expect(mockPrismaService.metricsCronExecution.findMany).toHaveBeenCalled();
    });

    it('should return empty array when no failed executions exist', async () => {
      mockPrismaService.metricsCronExecution.findMany.mockResolvedValue([]);

      const result = await service.getFailedExecutionsInMonth(2024, 1);

      expect(result).toHaveLength(0);
    });
  });

  describe('updateExecutionStatusToSuccess', () => {
    it('should update execution status to SUCCESS', async () => {
      const executionDate = new Date('2024-01-15');
      mockPrismaService.metricsCronExecution.updateMany.mockResolvedValue({});

      await service.updateExecutionStatusToSuccess(executionDate);

      expect(mockPrismaService.metricsCronExecution.updateMany).toHaveBeenCalled();
    });
  });

  describe('processMetricsForDate', () => {
    it('should process metrics for a date successfully', async () => {
      const targetDate = new Date('2024-01-15');
      const mockStores = [{ id: 'store-1' }, { id: 'store-2' }];

      mockPrismaService.metricsCronExecution.findUnique.mockResolvedValue(null);
      mockPrismaService.store.findMany.mockResolvedValue(mockStores);
      mockMetricsService.recalculateStoreMetrics.mockResolvedValue(undefined);
      mockPrismaService.metricsCronExecution.create.mockResolvedValue({});

      await service.processMetricsForDate(targetDate);

      expect(mockPrismaService.store.findMany).toHaveBeenCalled();
      expect(mockMetricsService.recalculateStoreMetrics).toHaveBeenCalledTimes(
        2,
      );
    });

    it('should skip if already processed successfully', async () => {
      const targetDate = new Date('2024-01-15');
      mockPrismaService.metricsCronExecution.findUnique.mockResolvedValue({
        status: 'SUCCESS',
      });

      await service.processMetricsForDate(targetDate);

      expect(mockPrismaService.store.findMany).not.toHaveBeenCalled();
      expect(mockMetricsService.recalculateStoreMetrics).not.toHaveBeenCalled();
    });
  });
});

