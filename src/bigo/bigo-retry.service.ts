import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BigoService } from './bigo.service';

@Injectable()
export class BigoRetryService {
  private readonly logger = new Logger(BigoRetryService.name);
  private readonly maxRetries = 3;
  private readonly retryDelays = [5, 15, 30]; // minutos

  constructor(
    private readonly prisma: PrismaService,
    private readonly bigoService: BigoService,
  ) {}

  /**
   * Adiciona uma recarga à fila de retry
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
   * Processa a fila de retry a cada 2 minutos
   */
  @Cron('0 */2 * * * *') // A cada 2 minutos
  async processRetryQueue() {
    this.logger.debug('Processing retry queue...');

    try {
      // Busca recargas pendentes de retry
      const pendingRetries = await this.prisma.bigoRecharge.findMany({
        where: {
          status: 'RETRY_PENDING',
          nextRetry: { lte: new Date() },
          attempts: { lt: this.maxRetries },
        },
        orderBy: { nextRetry: 'asc' },
        take: 10, // Processa 10 por vez
      });

      this.logger.log(`Found ${pendingRetries.length} pending retries`);

      for (const recharge of pendingRetries) {
        await this.processRetry(recharge);
      }
    } catch (error) {
      this.logger.error(`Error processing retry queue: ${error.message}`);
    }
  }

  /**
   * Processa um retry individual
   */
  private async processRetry(recharge: any) {
    this.logger.log(`Processing retry for recharge ${recharge.id} (attempt ${recharge.attempts})`);

    try {
      // Marca como REQUESTED para evitar processamento duplicado
      await this.prisma.bigoRecharge.update({
        where: { id: recharge.id },
        data: { status: 'REQUESTED' },
      });

      // Reconstrói o DTO baseado no endpoint
      const dto = this.reconstructDto(recharge);

      // Tenta a requisição novamente
      let response;
      if (recharge.endpoint === '/sign/agent/recharge_pre_check') {
        response = await this.bigoService.rechargePrecheck(dto as any);
      } else if (recharge.endpoint === '/sign/agent/rs_recharge') {
        response = await this.bigoService.diamondRecharge(dto as any);
      } else if (recharge.endpoint === '/sign/agent/disable') {
        response = await this.bigoService.disableRecharge(dto as any);
      }

      // Sucesso - atualiza o log original
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

      // Verifica se ainda pode tentar novamente
      if (recharge.attempts < this.maxRetries) {
        const delayMinutes = this.retryDelays[recharge.attempts] || 30;
        await this.addToRetryQueue(recharge.id, delayMinutes);
      } else {
        // Máximo de tentativas atingido
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
   * Reconstrói o DTO baseado no endpoint e dados salvos
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
   * Obtém estatísticas da fila de retry
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
