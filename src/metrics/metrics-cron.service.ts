import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsCronService {
  private readonly logger = new Logger(MetricsCronService.name);
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Cron executed daily at 5 AM (Brazil time = 8 AM UTC)
   * Processes metrics from previous day and checks for missing days
   */
  @Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
  async processDailyMetrics() {
    this.logger.log('Starting daily metrics processing cron job...');

    try {
      // 1. Check and recover missing days (last 5 days)
      await this.checkAndRecoverMissingDays();

      // 2. Process previous day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      await this.processMetricsForDate(yesterday);
    } catch (error) {
      this.logger.error('Critical error in daily metrics cron:', error);
    }
  }

  /**
   * Checks for missing days in last 5 days and reprocesses automatically
   */
  async checkAndRecoverMissingDays(): Promise<void> {
    this.logger.log('Checking for missing days in last 5 days...');

    try {
      const now = new Date();
      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      fiveDaysAgo.setHours(0, 0, 0, 0);

      // Find successful executions from last 5 days
      const successfulExecutions = await this.prisma.metricsCronExecution.findMany({
        where: {
          executionDate: {
            gte: fiveDaysAgo,
            lt: now,
          },
          status: 'SUCCESS',
        },
        select: {
          executionDate: true,
        },
      });

      const processedDates = new Set(
        successfulExecutions.map((e) =>
          e.executionDate.toISOString().split('T')[0],
        ),
      );

      // Identify missing days
      const missingDays: Date[] = [];
      const currentDate = new Date(fiveDaysAgo);

      while (currentDate < now) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (!processedDates.has(dateStr)) {
          missingDays.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (missingDays.length === 0) {
        this.logger.log('No missing days found in last 5 days.');
        return;
      }

      this.logger.warn(
        `Found ${missingDays.length} missing day(s) in last 5 days. Starting recovery...`,
      );

      // Reprocess missing days in chronological order
      for (const missingDate of missingDays) {
        this.logger.log(
          `Recovering metrics for ${missingDate.toISOString().split('T')[0]}...`,
        );
        await this.processMetricsForDate(missingDate);
      }

      this.logger.log(
        `Recovery completed. Processed ${missingDays.length} missing day(s).`,
      );
    } catch (error) {
      this.logger.error('Error checking for missing days:', error);
    }
  }

  /**
   * Processes metrics for a specific date
   */
  async processMetricsForDate(targetDate: Date): Promise<void> {
    const executionDate = new Date(targetDate);
    executionDate.setHours(0, 0, 0, 0);

    const startTime = Date.now();

    this.logger.log(
      `Starting metrics processing for ${executionDate.toISOString().split('T')[0]}`,
    );

    try {
      // Check if already processed successfully
      const existing = await this.prisma.metricsCronExecution.findUnique({
        where: { executionDate },
      });

      if (existing?.status === 'SUCCESS') {
        this.logger.log(
          `Date ${executionDate.toISOString().split('T')[0]} already processed successfully`,
        );
        return;
      }

      // Check previous attempts to avoid infinite loop
      if (existing) {
        const retryCount = await this.getRetryCount(executionDate);
        if (retryCount >= this.MAX_RETRIES) {
          this.logger.warn(
            `Date ${executionDate.toISOString().split('T')[0]} has failed ${retryCount} times. Marking as FAILED_PERMANENT.`,
          );
          await this.prisma.metricsCronExecution.update({
            where: { executionDate },
            data: {
              status: 'FAILED_PERMANENT',
              completedAt: new Date(),
            },
          });
          return;
        }
      }

      // Create or update execution record
      const execution = await this.prisma.metricsCronExecution.upsert({
        where: { executionDate },
        create: {
          executionDate,
          status: 'PROCESSING',
          startedAt: new Date(),
          storesProcessed: 0,
          storesTotal: 0,
        },
        update: {
          status: 'PROCESSING',
          startedAt: new Date(),
          storesProcessed: 0,
        },
      });

      // Find all stores
      const stores = await this.prisma.store.findMany({
        select: { id: true },
      });

      const storesTotal = stores.length;
      let storesProcessed = 0;
      let storesFailed = 0;

      // Process sequentially (safer)
      for (const store of stores) {
        try {
          await this.metricsService.recalculateStoreMetrics(
            store.id,
            executionDate,
          );
          storesProcessed++;
        } catch (error) {
          storesFailed++;
          this.logger.error(
            `Failed to process metrics for store ${store.id}: ${error.message}`,
          );
        }
      }

      const executionTime = Date.now() - startTime;
      const finalStatus =
        storesFailed === 0
          ? 'SUCCESS'
          : storesFailed === storesTotal
            ? 'FAILED'
            : 'PARTIAL';

      // Update execution record
      await this.prisma.metricsCronExecution.update({
        where: { id: execution.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          storesProcessed,
          storesTotal: storesTotal,
          executionTime,
        },
      });

      this.logger.log(
        `Metrics processing completed for ${executionDate.toISOString().split('T')[0]}: ` +
          `${storesProcessed}/${storesTotal} stores processed. Status: ${finalStatus}. ` +
          `Time: ${executionTime}ms`,
      );

      if (storesFailed > 0) {
        this.logger.warn(
          `${storesFailed} stores failed to process. Check logs for details.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Critical error processing metrics for ${executionDate.toISOString().split('T')[0]}: ${error.message}`,
      );

      // Atualiza status para FAILED
      await this.prisma.metricsCronExecution.upsert({
        where: { executionDate },
        create: {
          executionDate,
          status: 'FAILED',
          completedAt: new Date(),
        },
        update: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });
    }
  }

  /**
   * Counts how many times a date was processed without success
   */
  private async getRetryCount(executionDate: Date): Promise<number> {
    const executions = await this.prisma.metricsCronExecution.findMany({
      where: {
        executionDate,
        status: {
          in: ['FAILED', 'PARTIAL'],
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    return executions.length;
  }

  /**
   * Returns cron health status for a specific month
   */
  async getCronHealthStatus(
    year: number,
    month: number,
  ): Promise<'OK' | 'WARNING' | 'ERROR'> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const executions = await this.prisma.metricsCronExecution.findMany({
      where: {
        executionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        status: true,
      },
    });

    if (executions.length === 0) {
      return 'OK'; // Nenhuma execução ainda (mês futuro ou sem dados)
    }

    const hasFailedPermanent = executions.some(
      (e) => e.status === 'FAILED_PERMANENT',
    );
    if (hasFailedPermanent) {
      return 'ERROR';
    }

    const hasFailedOrPartial = executions.some(
      (e) => e.status === 'FAILED' || e.status === 'PARTIAL',
    );
    if (hasFailedOrPartial) {
      return 'WARNING';
    }

    return 'OK';
  }

  /**
   * Método manual para reprocessar uma data específica
   */
  async manualProcessDate(date: string): Promise<void> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    await this.processMetricsForDate(targetDate);
  }

  /**
   * Updates execution status to SUCCESS after successful manual recalculation
   */
  async updateExecutionStatusToSuccess(executionDate: Date): Promise<void> {
    await this.prisma.metricsCronExecution.updateMany({
      where: {
        executionDate,
        status: {
          in: ['FAILED', 'PARTIAL', 'FAILED_PERMANENT'],
        },
      },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Finds failed executions in current month
   */
  async getFailedExecutionsInMonth(
    year: number,
    month: number,
  ): Promise<Date[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const failedExecutions = await this.prisma.metricsCronExecution.findMany({
      where: {
        executionDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['FAILED', 'PARTIAL', 'FAILED_PERMANENT'],
        },
      },
      select: {
        executionDate: true,
      },
      orderBy: {
        executionDate: 'asc',
      },
    });

    return failedExecutions.map((e) => e.executionDate);
  }
}

