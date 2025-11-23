import { Injectable, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
  createHash,
} from 'crypto';
import { env } from '../env';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 12; // 96 bits for GCM
  private readonly tagLength = 16; // 128 bits for GCM
  private readonly saltLength = 16;
  private readonly iterations = 100000; // PBKDF2 iterations

  /**
   * Derives encryption key from master key using PBKDF2
   */
  private getEncryptionKey(): Buffer {
    const masterKey = env.ENCRYPTION_KEY;

    if (!masterKey) {
      throw new Error('ENCRYPTION_KEY is not configured');
    }

    // Use a fixed salt derived from a hash of the master key
    // This ensures the same key is always derived from the same master key
    const salt = createHash('sha256')
      .update(masterKey)
      .digest()
      .slice(0, this.saltLength);

    // Derive key using PBKDF2
    return pbkdf2Sync(masterKey, salt, this.iterations, this.keyLength, 'sha256');
  }

  /**
   * Encrypts plaintext using AES-256-GCM
   * Returns base64 encoded string: iv:tag:ciphertext
   */
  encrypt(plaintext: string): string {
    try {
      if (!plaintext) {
        return plaintext;
      }

      const key = this.getEncryptionKey();
      const iv = randomBytes(this.ivLength);

      const cipher = createCipheriv(this.algorithm, key, iv);
      cipher.setAAD(Buffer.from('bravive-token', 'utf8')); // Additional authenticated data

      let ciphertext = cipher.update(plaintext, 'utf8');
      ciphertext = Buffer.concat([ciphertext, cipher.final()]);

      const tag = cipher.getAuthTag();

      // Combine iv:tag:ciphertext and encode as base64
      const combined = Buffer.concat([
        iv,
        tag,
        ciphertext,
      ]);

      return combined.toString('base64');
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw new Error(`Failed to encrypt data: ${error.message}`);
    }
  }

  /**
   * Decrypts ciphertext encrypted with AES-256-GCM
   * Expects base64 encoded string: iv:tag:ciphertext
   */
  decrypt(ciphertext: string): string {
    try {
      if (!ciphertext) {
        return ciphertext;
      }

      const key = this.getEncryptionKey();
      const combined = Buffer.from(ciphertext, 'base64');

      // Extract iv, tag, and encrypted data
      const iv = combined.slice(0, this.ivLength);
      const tag = combined.slice(
        this.ivLength,
        this.ivLength + this.tagLength,
      );
      const encrypted = combined.slice(this.ivLength + this.tagLength);

      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from('bravive-token', 'utf8'));

      let plaintext = decipher.update(encrypted);
      plaintext = Buffer.concat([plaintext, decipher.final()]);

      return plaintext.toString('utf8');
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`);
      throw new Error(
        `Failed to decrypt data: ${error.message}. Token may be corrupted or encrypted with different key.`,
      );
    }
  }
}

