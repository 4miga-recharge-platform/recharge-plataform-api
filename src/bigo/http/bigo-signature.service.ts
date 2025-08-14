import { Injectable, Logger } from '@nestjs/common';
import { createHash, createSign } from 'crypto';
import { env } from '../../env';

@Injectable()
export class BigoSignatureService {
  private readonly logger = new Logger(BigoSignatureService.name);

  async generateHeaders(data: any, endpoint: string, timestamp: string) {
    const clientId = env.BIGO_CLIENT_ID;
    const clientVersion = env.BIGO_CLIENT_VERSION || '0';

    if (!clientId) {
      throw new Error('BIGO_CLIENT_ID is required');
    }

    const signature = await this.generateSignature(data, endpoint, timestamp);

    return {
      'Content-Type': 'application/json',
      'bigo-client-id': clientId,
      'bigo-timestamp': timestamp,
      'bigo-client-version': clientVersion,
      'bigo-oauth-signature': signature,
    };
  }

  private async generateSignature(data: any, endpoint: string, timestamp: string): Promise<string> {
    try {
      // Step 1: Create the message to sign
      const messageToSign = this.createMessageToSign(data, endpoint, timestamp);

      // Step 2: Hash the message with SHA256
      const messageHash = createHash('sha256').update(messageToSign).digest();

      // Step 3: Sign the hash with private key
      const signature = await this.signWithPrivateKey(messageHash);

      return signature;
    } catch (error) {
      this.logger.error(`Failed to generate signature: ${error.message}`);
      throw new Error(`Signature generation failed: ${error.message}`);
    }
  }

  private createMessageToSign(data: any, endpoint: string, timestamp: string): string {
    // Format: JSON data + endpoint + timestamp
    const jsonData = JSON.stringify(data);
    return `${jsonData}${endpoint}${timestamp}`;
  }

  private async signWithPrivateKey(messageHash: Buffer): Promise<string> {
    const privateKey = env.BIGO_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error('BIGO_PRIVATE_KEY is required for signature generation');
    }

    try {
      // Create sign object with RSA-SHA256
      const sign = createSign('RSA-SHA256');
      sign.update(messageHash);

      // Sign with private key
      const signature = sign.sign(privateKey, 'base64');

      return signature;
    } catch (error) {
      this.logger.error(`Failed to sign with private key: ${error.message}`);
      throw new Error(`Private key signing failed: ${error.message}`);
    }
  }
}
