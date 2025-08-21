
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { env } from '../env';
import { RechargePrecheckDto } from './dto/recharge-precheck.dto';
import { DiamondRechargeDto } from './dto/diamond-recharge.dto';
import { DisableRechargeDto } from './dto/disable-recharge.dto';
import { BigoSignatureService } from './http/bigo-signature.service';
import { PrismaService } from '../prisma/prisma.service';
import { BigoRetryService } from './bigo-retry.service';

@Injectable()
export class BigoService {
  private readonly logger = new Logger(BigoService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly signatureService: BigoSignatureService,
    private readonly prisma: PrismaService,
    private readonly retryService: BigoRetryService,
  ) {
    this.baseUrl = env.BIGO_HOST_DOMAIN || 'https://oauth.bigolive.tv';
  }

    async rechargePrecheck(dto: RechargePrecheckDto) {
    this.logger.log(`Recharge precheck for bigoid: ${dto.recharge_bigoid}`);

    // Business validation: check if seqid is already used
    const existingRecharge = await this.prisma.bigoRecharge.findFirst({
      where: { seqid: dto.seqid },
    });

    if (existingRecharge) {
      throw new BadRequestException(`seqid '${dto.seqid}' has already been used`);
    }

    try {
      const response = await this.makeSignedRequest(
        '/sign/agent/recharge_pre_check',
        dto,
      );

      // Create log entry ONLY on success
      await this.prisma.bigoRecharge.create({
        data: {
          seqid: dto.seqid,
          endpoint: '/sign/agent/recharge_pre_check',
          status: 'SUCCESS',
          requestBody: dto as any,
          responseBody: response,
        },
      });

      return response;
    } catch (error) {
      this.logger.error(`Recharge precheck failed: ${error.message}`);

      // Re-throw as BadRequestException to follow app pattern
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Recharge precheck failed: ${error.message}`);
    }
  }

      async diamondRecharge(dto: DiamondRechargeDto) {
    this.logger.log(`Diamond recharge for bigoid: ${dto.recharge_bigoid}, value: ${dto.value}`);

    // Business validation: check if seqid is already used
    const existingRecharge = await this.prisma.bigoRecharge.findFirst({
      where: { seqid: dto.seqid },
    });

    if (existingRecharge) {
      throw new BadRequestException(`seqid '${dto.seqid}' has already been used`);
    }

    // Business validation: check if bu_orderid is already used
    const existingOrder = await this.prisma.bigoRecharge.findFirst({
      where: { buOrderId: dto.bu_orderid },
    });

    if (existingOrder) {
      throw new BadRequestException(`bu_orderid '${dto.bu_orderid}' has already been used`);
    }

    // Create log entry
    const logEntry = await this.prisma.bigoRecharge.create({
      data: {
        seqid: dto.seqid,
        buOrderId: dto.bu_orderid,
        endpoint: '/sign/agent/rs_recharge',
        status: 'REQUESTED',
        requestBody: dto as any,
      },
    });

    try {
      const response = await this.makeSignedRequest(
        '/sign/agent/rs_recharge',
        dto,
      );

      // Update log with success
      await this.prisma.bigoRecharge.update({
        where: { id: logEntry.id },
        data: {
          status: 'SUCCESS',
          responseBody: response,
        },
      });

      return response;
    } catch (error) {
      this.logger.error(`Diamond recharge failed: ${error.message}`);

      // Add to retry queue with error code and message
      const rescode = this.extractRescodeFromError(error);
      await this.retryService.addToRetryQueue(logEntry.id, rescode, error.message);

      // Re-throw as BadRequestException to follow app pattern
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Diamond recharge failed: ${error.message}`);
    }
  }

    async disableRecharge(dto: DisableRechargeDto) {
    this.logger.log('Disabling recharge APIs');

    // Create log entry
    const logEntry = await this.prisma.bigoRecharge.create({
      data: {
        seqid: dto.seqid,
        endpoint: '/sign/agent/disable',
        status: 'REQUESTED',
        requestBody: dto as any,
      },
    });

    try {
      const response = await this.makeSignedRequest(
        '/sign/agent/disable',
        dto,
      );

      // Update log with success
      await this.prisma.bigoRecharge.update({
        where: { id: logEntry.id },
        data: {
          status: 'SUCCESS',
          responseBody: response,
        },
      });

      return response;
    } catch (error) {
      this.logger.error(`Disable recharge failed: ${error.message}`);

      // Add to retry queue with error code and message
      const rescode = this.extractRescodeFromError(error);
      await this.retryService.addToRetryQueue(logEntry.id, rescode, error.message);

      // Re-throw as BadRequestException to follow app pattern
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Disable recharge failed: ${error.message}`);
    }
  }

  private async makeSignedRequest(endpoint: string, data: any) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const headers = await this.signatureService.generateHeaders(data, endpoint, timestamp);

    // Try primary domain first
    const primaryUrl = `${this.baseUrl}${endpoint}`;
    this.logger.debug(`Making request to primary domain: ${primaryUrl}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(primaryUrl, data, { headers })
      );

      // Validate Bigo API response
      if (response.data.rescode !== 0) {
        const errorMessage = this.getBigoErrorMessage(response.data.rescode, response.data.message);
        throw new BadRequestException(errorMessage);
      }

      return response.data;
    } catch (error) {
      this.logger.warn(`Primary domain failed: ${error.message}`);

      // Try backup domain if configured
      const backupDomain = env.BIGO_HOST_BACKUP_DOMAIN;
      if (backupDomain) {
        const backupUrl = `${backupDomain}${endpoint}`;
        this.logger.debug(`Retrying with backup domain: ${backupUrl}`);

        try {
          const backupResponse = await firstValueFrom(
            this.httpService.post(backupUrl, data, { headers })
          );

          // Validate backup response
          if (backupResponse.data.rescode !== 0) {
            const errorMessage = this.getBigoErrorMessage(backupResponse.data.rescode, backupResponse.data.message);
            throw new BadRequestException(errorMessage);
          }

          this.logger.log(`Backup domain request successful`);
          return backupResponse.data;
        } catch (backupError) {
          this.logger.error(`Backup domain also failed: ${backupError.message}`);
          throw new BadRequestException(`Network error: ${backupError.message}`);
        }
      } else {
        throw new BadRequestException(`Network error: ${error.message}`);
      }
    }
  }



  async getRechargeLogs(limit = 10) {
    this.logger.log(`Fetching last ${limit} recharge logs`);

    try {
      const logs = await this.prisma.bigoRecharge.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          seqid: true,
          buOrderId: true,
          endpoint: true,
          status: true,
          rescode: true,
          message: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        logs,
        total: logs.length,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch recharge logs: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs: [],
        total: 0,
      };
    }
  }

  async getRetryStats() {
    return this.retryService.getRetryStats();
  }

    /**
   * Extrai o rescode de uma mensagem de erro
   */
  private extractRescodeFromError(error: any): number {
    if (error.message && error.message.includes('Bigo API Error')) {
      const match = error.message.match(/\((\d+)\)/);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return 500001; // default para erro interno
  }

  /**
   * Maps Bigo error codes to user-friendly messages
   */
  private getBigoErrorMessage(rescode: number, originalMessage: string): string {
    const errorMap: Record<number, string> = {
      // Invalid parameters
      400001: 'Invalid request parameters',

      // APIs disabled
      7212001: 'Recharge API disabled by Bigo',
      7212002: 'Recharge API disabled by third-party website',

      // Authorization issues
      7212003: 'IP not authorized to make requests',
      7212006: 'Reseller not linked to client_id',

      // User issues
      7212004: 'Bigo user does not exist',
      7212005: 'User cannot be recharged',

      // Business issues
      7212008: 'Diamond amount exceeds upper limit',
      7212009: 'Currency not supported',
      7212010: 'Order ID duplicated',
      7212011: 'Insufficient balance',
      7212012: 'Request too frequent, please wait a moment',
      7212013: 'Diamond pricing outside specified range',
      7212014: 'User area not eligible',
      7212015: 'Recharge not supported in your area',

      // Other errors
      500001: 'Internal error, contact Bigo team',
    };

    const userMessage = errorMap[rescode];
    if (userMessage) {
      return `Bigo API Error (${rescode}): ${userMessage}`;
    }

    return `Bigo API Error (${rescode}): ${originalMessage || 'Unknown error'}`;
  }
}
