import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { env } from '../env';
import { RechargePrecheckDto } from './dto/recharge-precheck.dto';
import { DiamondRechargeDto } from './dto/diamond-recharge.dto';
import { DisableRechargeDto } from './dto/disable-recharge.dto';
import { BigoSignatureService } from './http/bigo-signature.service';

@Injectable()
export class BigoService {
  private readonly logger = new Logger(BigoService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly signatureService: BigoSignatureService,
  ) {
    this.baseUrl = env.BIGO_HOST_DOMAIN || 'https://oauth.bigolive.tv';
  }

  async rechargePrecheck(dto: RechargePrecheckDto) {
    this.logger.log(`Recharge precheck for bigoid: ${dto.recharge_bigoid}`);

    try {
      const response = await this.makeSignedRequest(
        '/sign/agent/recharge_pre_check',
        dto,
      );

      return response;
    } catch (error) {
      this.logger.error(`Recharge precheck failed: ${error.message}`);
      throw error;
    }
  }

    async diamondRecharge(dto: DiamondRechargeDto) {
    this.logger.log(`Diamond recharge for bigoid: ${dto.recharge_bigoid}, value: ${dto.value}`);

    try {
      const response = await this.makeSignedRequest(
        '/sign/agent/rs_recharge',
        dto,
      );

      return response;
    } catch (error) {
      this.logger.error(`Diamond recharge failed: ${error.message}`);
      throw error;
    }
  }

  async disableRecharge(dto: DisableRechargeDto) {
    this.logger.log('Disabling recharge APIs');

    try {
      const response = await this.makeSignedRequest(
        '/sign/agent/disable',
        dto,
      );

      return response;
    } catch (error) {
      this.logger.error(`Disable recharge failed: ${error.message}`);
      throw error;
    }
  }

  private async makeSignedRequest(endpoint: string, data: any) {
    const url = `${this.baseUrl}${endpoint}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const headers = await this.signatureService.generateHeaders(data, endpoint, timestamp);

    this.logger.debug(`Making request to: ${url}`);

    const response = await firstValueFrom(
      this.httpService.post(url, data, { headers })
    );

    return response.data;
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
}
