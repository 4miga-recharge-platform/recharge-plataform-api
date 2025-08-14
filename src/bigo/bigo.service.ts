import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { env } from '../env';
import { RechargePrecheckDto } from './dto/recharge-precheck.dto';
import { DiamondRechargeDto } from './dto/diamond-recharge.dto';
import { DisableRechargeDto } from './dto/disable-recharge.dto';
import { BigoSignatureService } from './http/bigo-signature.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BigoService {
  private readonly logger = new Logger(BigoService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly signatureService: BigoSignatureService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl = env.BIGO_HOST_DOMAIN || 'https://oauth.bigolive.tv';
  }

    async rechargePrecheck(dto: RechargePrecheckDto) {
    this.logger.log(`Recharge precheck for bigoid: ${dto.recharge_bigoid}`);

    // Create log entry
    const logEntry = await this.prisma.bigoRecharge.create({
      data: {
        seqid: dto.seqid,
        endpoint: '/sign/agent/recharge_pre_check',
        status: 'REQUESTED',
        requestBody: dto as any,
      },
    });

    try {
      const response = await this.makeSignedRequest(
        '/sign/agent/recharge_pre_check',
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
      this.logger.error(`Recharge precheck failed: ${error.message}`);

      // Update log with error
      await this.prisma.bigoRecharge.update({
        where: { id: logEntry.id },
        data: {
          status: 'FAILED',
          message: error.message,
        },
      });

      throw error;
    }
  }

      async diamondRecharge(dto: DiamondRechargeDto) {
    this.logger.log(`Diamond recharge for bigoid: ${dto.recharge_bigoid}, value: ${dto.value}`);

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

      // Update log with error
      await this.prisma.bigoRecharge.update({
        where: { id: logEntry.id },
        data: {
          status: 'FAILED',
          message: error.message,
        },
      });

      throw error;
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

      // Update log with error
      await this.prisma.bigoRecharge.update({
        where: { id: logEntry.id },
        data: {
          status: 'FAILED',
          message: error.message,
        },
      });

      throw error;
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
          this.logger.log(`Backup domain request successful`);
          return backupResponse.data;
        } catch (backupError) {
          this.logger.error(`Backup domain also failed: ${backupError.message}`);
          throw backupError;
        }
      } else {
        throw error;
      }
    }
  }

    async testSignature() {
    this.logger.log('Testing signature generation');

    try {
      const testResult = this.signatureService.testSignatureGeneration();
      return {
        success: true,
        testData: testResult,
        message: 'Signature generation test completed',
      };
    } catch (error) {
      this.logger.error(`Signature test failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Signature generation test failed',
      };
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

  async testConnectivity() {
    this.logger.log('Testing Bigo API connectivity');

    const testData = { msg: 'connectivity_test' };
    const endpoint = '/oauth2/test_sign';

    const results = {
      primary: { url: this.baseUrl, status: 'unknown', error: null as string | null },
      backup: { url: env.BIGO_HOST_BACKUP_DOMAIN, status: 'unknown', error: null as string | null },
    };

    // Test primary domain
    try {
      const primaryUrl = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`Testing primary domain: ${primaryUrl}`);

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const headers = await this.signatureService.generateHeaders(testData, endpoint, timestamp);

      const response = await firstValueFrom(
        this.httpService.post(primaryUrl, testData, { headers, timeout: 10000 })
      );

      results.primary.status = 'success';
      results.primary.error = null;
    } catch (error) {
      results.primary.status = 'failed';
      results.primary.error = error.message;
      this.logger.warn(`Primary domain test failed: ${error.message}`);
    }

    // Test backup domain if configured
    if (env.BIGO_HOST_BACKUP_DOMAIN) {
      try {
        const backupUrl = `${env.BIGO_HOST_BACKUP_DOMAIN}${endpoint}`;
        this.logger.debug(`Testing backup domain: ${backupUrl}`);

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const headers = await this.signatureService.generateHeaders(testData, endpoint, timestamp);

        const response = await firstValueFrom(
          this.httpService.post(backupUrl, testData, { headers, timeout: 10000 })
        );

        results.backup.status = 'success';
        results.backup.error = null;
      } catch (error) {
        results.backup.status = 'failed';
        results.backup.error = error.message;
        this.logger.warn(`Backup domain test failed: ${error.message}`);
      }
    } else {
      results.backup.status = 'not_configured';
      results.backup.error = 'Backup domain not configured';
    }

    return {
      success: results.primary.status === 'success' || results.backup.status === 'success',
      results,
      timestamp: new Date().toISOString(),
    };
  }
}
