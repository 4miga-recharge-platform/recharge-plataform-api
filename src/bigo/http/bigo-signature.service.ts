import { Injectable, Logger } from '@nestjs/common';
import { createSign, generateKeyPairSync } from 'crypto';
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

  private async generateSignature(
    data: any,
    endpoint: string,
    timestamp: string,
  ): Promise<string> {
    try {
      // Step 1: Create the message to sign
      const messageToSign = this.createMessageToSign(data, endpoint, timestamp);

      // Step 2: Sign the message with RSA-SHA256 (createSign will hash internally)
      const signature = await this.signWithPrivateKey(messageToSign);

      return signature;
    } catch (error) {
      this.logger.error(`Failed to generate signature: ${error.message}`);
      throw new Error(`Signature generation failed: ${error.message}`);
    }
  }

  private createMessageToSign(
    data: any,
    endpoint: string,
    timestamp: string,
  ): string {
    // Format: JSON string + endpoint + timestamp (as per Bigo example code)
    const request = JSON.stringify(data);
    return `${request}${endpoint}${timestamp}`;
  }

  private async signWithPrivateKey(message: string): Promise<string> {
    let privateKey = env.BIGO_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error('BIGO_PRIVATE_KEY is required for signature generation');
    }

    try {
      // Check if private key is base64 encoded
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        // Decode from base64
        privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
      }

      // Create sign object with RSA-SHA256 (it will hash the message internally)
      const sign = createSign('RSA-SHA256');
      sign.update(message, 'utf8');

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
  testSignatureGeneration(): {
    message: string;
    signature: string;
    timestamp: string;
  } {
    const testData = { msg: 'hello' };
    const endpoint = '/oauth2/test_sign';
    const timestamp = '1688701573'; // Using the example timestamp from documentation

    const messageToSign = this.createMessageToSign(
      testData,
      endpoint,
      timestamp,
    );

    // Note: This will only work if BIGO_PRIVATE_KEY is set
    const signature = this.signWithPrivateKeySync(messageToSign);

    return {
      message: messageToSign,
      signature: signature,
      timestamp,
    };
  }

  private signWithPrivateKeySync(message: string): string {
    let privateKey = env.BIGO_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error('BIGO_PRIVATE_KEY is required for signature generation');
    }

    try {
      // Check if private key is base64 encoded
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        // Decode from base64
        privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
      }

      // Create sign object with RSA-SHA256 (it will hash the message internally)
      const sign = createSign('RSA-SHA256');
      sign.update(message, 'utf8');

      // Sign with private key
      const signature = sign.sign(privateKey, 'base64');

      return signature;
    } catch (error) {
      this.logger.error(`Failed to sign with private key: ${error.message}`);
      throw new Error(`Private key signing failed: ${error.message}`);
    }
  }
}
