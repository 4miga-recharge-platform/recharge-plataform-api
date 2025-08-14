import { Injectable, Logger } from '@nestjs/common';
import { createHash, createSign, generateKeyPairSync } from 'crypto';
import { env } from '../../env';

@Injectable()
export class BigoSignatureService {
  private readonly logger = new Logger(BigoSignatureService.name);

  async generateHeaders(data: any, endpoint: string, timestamp: string) {
    const clientId = env.BIGO_CLIENT_ID;
    const clientVersion = '0';

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
    // Format: JSON data + endpoint + timestamp (exactly as per Bigo documentation)
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

  /**
   * This should be used only for development/testing
   */
  generateRSAKeyPair(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { privateKey, publicKey };
  }

  /**
   * Test signature generation with demo data (as per Bigo documentation)
   */
  testSignatureGeneration(): { message: string; signature: string; timestamp: string } {
    const testData = { msg: 'hello' };
    const endpoint = '/oauth2/test_sign';
    const timestamp = '1688701573'; // Using the example timestamp from documentation

    const messageToSign = this.createMessageToSign(testData, endpoint, timestamp);
    const messageHash = createHash('sha256').update(messageToSign).digest();

    // Note: This will only work if BIGO_PRIVATE_KEY is set
    const signature = this.signWithPrivateKeySync(messageHash);

    return {
      message: messageToSign,
      signature: signature,
      timestamp,
    };
  }

  private signWithPrivateKeySync(messageHash: Buffer): string {
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
