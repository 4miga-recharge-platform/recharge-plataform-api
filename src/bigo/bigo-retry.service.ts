import { Injectable, Logger, Inject, forwardRef, OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BigoService } from './bigo.service';

// Node.js globals
declare const setTimeout: (callback: (...args: any[]) => void, ms: number) => any;
declare const clearTimeout: (timeoutId: any) => void;

@Injectable()
export class BigoRetryService implements OnModuleDestroy {
  private readonly logger = new Logger(BigoRetryService.name);
  private readonly maxRetries = 3;
  private readonly retryDelays = [3, 13, 28]; // minutos para erros gerais
  private retryTimeouts = new Map<string, any>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BigoService))
    private readonly bigoService: BigoService,
  ) {}

  /**
   * Determina se um erro deve ter retry baseado nos códigos da API Bigo
   */
  private shouldRetry(rescode: number): boolean {
    const retryableErrors = [
      7212012, // "request frequently, just wait a second to call" - Rate limit
      500001,  // "Other errors, contact Bigo team" - Erro interno temporário
    ];

    return retryableErrors.includes(rescode);
  }

  /**
   * Calcula delay de retry baseado no tipo de erro e tentativa
   */
  private getRetryDelay(rescode: number, attempt: number): number {
    if (rescode === 7212012) {
      // Rate limit - esperar mais tempo, progressivo
      return Math.min(30 * attempt, 120); // 30s, 60s, 90s, 120s max
    }

    // Erro interno - usar delays padrão
    return this.retryDelays[attempt - 1] || 30;
  }

  /**
   * Adiciona uma recarga à fila de retry com agendamento sob demanda
   */
  async addToRetryQueue(rechargeId: string, rescode: number, errorMessage: string, attemptNumber?: number) {
    const currentAttempt = attemptNumber || 1;

    // Verificar se o erro é retryable
    if (!this.shouldRetry(rescode)) {
      this.logger.warn(`Error ${rescode} is not retryable for recharge ${rechargeId}`);
      await this.markAsFailed(rechargeId, `Error ${rescode} is not retryable`);
      return;
    }

    if (currentAttempt > this.maxRetries) {
      // Máximo de tentativas atingido
      await this.markAsFailed(rechargeId, `Max retries (${this.maxRetries}) exceeded for error ${rescode}`);
      return;
    }

    const delayMinutes = this.getRetryDelay(rescode, currentAttempt);
    const nextRetry = new Date(Date.now() + delayMinutes * 60 * 1000);

    // Atualizar no banco
    await this.prisma.bigoRecharge.update({
      where: { id: rechargeId },
      data: {
        status: 'RETRY_PENDING',
        nextRetry,
        attempts: currentAttempt,
        rescode,
        message: errorMessage,
      },
    });

    // Agendar retry específico
    const timeout = setTimeout(() => {
      this.processSpecificRetry(rechargeId, currentAttempt);
    }, delayMinutes * 60 * 1000);

    // Armazenar timeout para possível cancelamento
    this.retryTimeouts.set(rechargeId, timeout);

    this.logger.log(errorMessage);
  }

  /**
   * Processa retry específico
   */
  private async processSpecificRetry(rechargeId: string, attemptNumber: number) {
    this.retryTimeouts.delete(rechargeId);

    try {
      const recharge = await this.prisma.bigoRecharge.findUnique({
        where: { id: rechargeId },
      });

      if (!recharge || recharge.status !== 'RETRY_PENDING') {
        this.logger.debug(`Recharge ${rechargeId} not found or already processed`);
        return; // Já foi processado ou cancelado
      }

      this.logger.log(`Processing retry ${attemptNumber} for recharge ${rechargeId}`);

      // Marcar como REQUESTED para evitar duplicação
      await this.prisma.bigoRecharge.update({
        where: { id: rechargeId },
        data: { status: 'REQUESTED' },
      });

      // Reconstruir DTO e tentar novamente
      const dto = this.reconstructDto(recharge);
      let response;

      if (recharge.endpoint === '/sign/agent/recharge_pre_check') {
        response = await this.bigoService.rechargePrecheck(dto as any);
      } else if (recharge.endpoint === '/sign/agent/rs_recharge') {
        response = await this.bigoService.diamondRecharge(dto as any);
      } else if (recharge.endpoint === '/sign/agent/disable') {
        response = await this.bigoService.disableRecharge(dto as any);
      }

      // Sucesso
      await this.prisma.bigoRecharge.update({
        where: { id: rechargeId },
        data: {
          status: 'SUCCESS',
          responseBody: response,
          nextRetry: null,
          message: `Retry ${attemptNumber} successful`,
        },
      });

      this.logger.log(`Retry ${attemptNumber} successful for recharge ${rechargeId}`);

    } catch (error) {
      this.logger.warn(`Retry ${attemptNumber} failed for recharge ${rechargeId}: ${error.message}`);

      // Extrair rescode do erro se possível
      let rescode = 500001; // default para erro interno
      if (error.message && error.message.includes('Bigo API Error')) {
        const match = error.message.match(/\((\d+)\)/);
        if (match) {
          rescode = parseInt(match[1]);
        }
      }

      // Agendar próxima tentativa se o erro for retryable
      if (this.shouldRetry(rescode)) {
        await this.addToRetryQueue(rechargeId, rescode, error.message, attemptNumber + 1);
      } else {
        await this.markAsFailed(rechargeId, `Retry ${attemptNumber} failed: ${error.message}`);
      }
    }
  }

  /**
   * Marca uma recarga como falhada
   */
  private async markAsFailed(rechargeId: string, message: string) {
    await this.prisma.bigoRecharge.update({
      where: { id: rechargeId },
      data: {
        status: 'FAILED',
        message,
        nextRetry: null,
      },
    });

    this.logger.error(`Recharge ${rechargeId} marked as failed: ${message}`);
  }

  /**
   * Cron de emergência (1x por hora) para retries perdidos
   * Apenas para casos onde o servidor reiniciou e perdeu os timeouts
   */
  @Cron('0 0 * * * *') // A cada hora
  async processStuckRetries() {
    try {
      const stuckRetries = await this.prisma.bigoRecharge.findMany({
        where: {
          status: 'RETRY_PENDING',
          nextRetry: { lt: new Date(Date.now() - 60 * 60 * 1000) }, // 1 hora atrasado
          attempts: { lt: this.maxRetries },
        },
      });

      if (stuckRetries.length > 0) {
        this.logger.warn(`Found ${stuckRetries.length} stuck retries, reprocessing...`);

        for (const retry of stuckRetries) {
          // Reagendar com delay mínimo
          const timeout = setTimeout(() => {
            this.processSpecificRetry(retry.id, retry.attempts);
          }, 30 * 1000); // 30 segundos

          this.retryTimeouts.set(retry.id, timeout);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing stuck retries: ${error.message}`);
    }
  }

  /**
   * Reconstrui DTO baseado no endpoint e dados salvos
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

    const retryableErrors = await this.prisma.bigoRecharge.groupBy({
      by: ['rescode'],
      where: {
        status: { in: ['FAILED', 'RETRY_PENDING'] },
        rescode: { in: [7212012, 500001] },
      },
      _count: { rescode: true },
    });

    return {
      stats,
      pendingRetries: pendingCount,
      maxRetries: this.maxRetries,
      retryDelays: this.retryDelays,
      retryableErrors,
      activeTimeouts: this.retryTimeouts.size,
    };
  }

  /**
   * Limpa timeouts ao destruir o módulo
   */
  onModuleDestroy() {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    this.logger.log('Cleared all retry timeouts');
  }
}
