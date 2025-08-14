import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BigoService } from './bigo.service';

@Injectable()
export class BigoRetryService {
  private readonly logger = new Logger(BigoRetryService.name);
  private readonly maxRetries = 3;
  private readonly retryDelays = [5, 15, 30]; // minutes



  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BigoService))
    private readonly bigoService: BigoService,
  ) {}

  /**
   * Adds a recharge to the retry queue
   */
  async addToRetryQueue(rechargeId: string, delayMinutes: number = 5) {
    const nextRetry = new Date(Date.now() + delayMinutes * 60 * 1000);

    await this.prisma.bigoRecharge.update({
      where: { id: rechargeId },
      data: {
        status: 'RETRY_PENDING',
        nextRetry,
        attempts: { increment: 1 },
      },
    });



    this.logger.log(`Added recharge ${rechargeId} to retry queue for ${nextRetry}`);
  }

  /**
   * Processes the retry queue every 5 minutes
   */
  @Cron('0 */5 * * * *') // Every 5 minutes
  async processRetryQueue() {
    try {
      // Quick check: only process if there are any pending retries
      const hasPending = await this.prisma.bigoRecharge.findFirst({
        where: {
          status: 'RETRY_PENDING',
          nextRetry: { lte: new Date() },
          attempts: { lt: this.maxRetries },
        },
        select: { id: true }, // Only select ID for faster query
      });

      if (!hasPending) {
        return; // Exit early, no processing needed
      }

      // Find pending retries for processing
      const pendingRetries = await this.prisma.bigoRecharge.findMany({
        where: {
          status: 'RETRY_PENDING',
          nextRetry: { lte: new Date() },
          attempts: { lt: this.maxRetries },
        },
        orderBy: { nextRetry: 'asc' },
        take: 50,
      });

      this.logger.debug(`Processing ${pendingRetries.length} retries`);

      // Process retries in parallel for better performance
      await Promise.all(
        pendingRetries.map(recharge => this.processRetry(recharge))
      );
    } catch (error) {
      this.logger.error(`Error processing retry queue: ${error.message}`);
    }
  }

  /**
   * Processes an individual retry
   */
  private async processRetry(recharge: any) {
    this.logger.log(`Processing retry for recharge ${recharge.id} (attempt ${recharge.attempts})`);

    try {
      // Mark as REQUESTED to avoid duplicate processing
      await this.prisma.bigoRecharge.update({
        where: { id: recharge.id },
        data: { status: 'REQUESTED' },
      });

      // Reconstruct DTO based on endpoint
      const dto = this.reconstructDto(recharge);

      // Try the request again
      let response;
      if (recharge.endpoint === '/sign/agent/recharge_pre_check') {
        response = await this.bigoService.rechargePrecheck(dto as any);
      } else if (recharge.endpoint === '/sign/agent/rs_recharge') {
        response = await this.bigoService.diamondRecharge(dto as any);
      } else if (recharge.endpoint === '/sign/agent/disable') {
        response = await this.bigoService.disableRecharge(dto as any);
      }

      // Success - update original log
      await this.prisma.bigoRecharge.update({
        where: { id: recharge.id },
        data: {
          status: 'SUCCESS',
          responseBody: response,
          nextRetry: null,
        },
      });



      this.logger.log(`Retry successful for recharge ${recharge.id}`);

    } catch (error) {
      this.logger.warn(`Retry failed for recharge ${recharge.id}: ${error.message}`);

      // Check if can try again
      if (recharge.attempts < this.maxRetries) {
        const delayMinutes = this.retryDelays[recharge.attempts] || 30;
        await this.addToRetryQueue(recharge.id, delayMinutes);
      } else {
        // Maximum retry attempts reached
        await this.prisma.bigoRecharge.update({
          where: { id: recharge.id },
          data: {
            status: 'FAILED',
            message: `Max retries (${this.maxRetries}) exceeded. Last error: ${error.message}`,
            nextRetry: null,
          },
        });

        this.logger.error(`Max retries exceeded for recharge ${recharge.id}`);
      }
    }
  }

  /**
   * Reconstructs DTO based on endpoint and saved data
   */
  private reconstructDto(recharge: any) {
    const requestBody = recharge.requestBody as any;

    switch (recharge.endpoint) {
      case '/sign/agent/recharge_pre_check':
        return {
          recharge_bigoid: requestBody.recharge_bigoid,
          seqid: requestBody.seqid,
        };

      case '/sign/agent/rs_recharge':
        return {
          recharge_bigoid: requestBody.recharge_bigoid,
          seqid: requestBody.seqid,
          bu_orderid: requestBody.bu_orderid,
          value: requestBody.value,
          total_cost: requestBody.total_cost,
          currency: requestBody.currency,
        };

      case '/sign/agent/disable':
        return {
          seqid: requestBody.seqid,
        };

      default:
        throw new Error(`Unknown endpoint: ${recharge.endpoint}`);
    }
  }

  /**
   * Gets retry queue statistics
   */
  async getRetryStats() {
    const stats = await this.prisma.bigoRecharge.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const pendingCount = await this.prisma.bigoRecharge.count({
      where: {
        status: 'RETRY_PENDING',
        nextRetry: { lte: new Date() },
      },
    });

    return {
      stats,
      pendingRetries: pendingCount,
      maxRetries: this.maxRetries,
      retryDelays: this.retryDelays,
    };
  }


}
