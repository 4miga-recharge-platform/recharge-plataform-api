import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from '../crypto.service';

// Mock env
jest.mock('../../env', () => ({
  env: {
    ENCRYPTION_KEY: 'test-encryption-key-minimum-32-characters-long-for-testing',
  },
}));

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('encrypt', () => {
    it('should encrypt plaintext successfully', () => {
      const plaintext = 'VA_433676ab1f29f3364ae83cdbb73628f97ffb26c5c6488c826e50e32067f64057';

      const ciphertext = service.encrypt(plaintext);

      expect(ciphertext).toBeDefined();
      expect(typeof ciphertext).toBe('string');
      expect(ciphertext).not.toBe(plaintext);
      expect(ciphertext.length).toBeGreaterThan(plaintext.length); // Base64 encoded
    });

    it('should return empty string when plaintext is empty', () => {
      const plaintext = '';

      const ciphertext = service.encrypt(plaintext);

      expect(ciphertext).toBe('');
    });

    it('should return null when plaintext is null', () => {
      const plaintext = null as any;

      const ciphertext = service.encrypt(plaintext);

      expect(ciphertext).toBeNull();
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'test-token-123';

      const ciphertext1 = service.encrypt(plaintext);
      const ciphertext2 = service.encrypt(plaintext);

      // Should be different due to random IV
      expect(ciphertext1).not.toBe(ciphertext2);
    });

    it('should handle encryption with valid key', () => {
      const plaintext = 'test-token';
      // Should not throw with valid key
      expect(() => {
        service.encrypt(plaintext);
      }).not.toThrow();
    });
  });

  describe('decrypt', () => {
    it('should decrypt ciphertext successfully', () => {
      const plaintext = 'VA_433676ab1f29f3364ae83cdbb73628f97ffb26c5c6488c826e50e32067f64057';

      const ciphertext = service.encrypt(plaintext);
      const decrypted = service.decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it('should return empty string when ciphertext is empty', () => {
      const ciphertext = '';

      const decrypted = service.decrypt(ciphertext);

      expect(decrypted).toBe('');
    });

    it('should return null when ciphertext is null', () => {
      const ciphertext = null as any;

      const decrypted = service.decrypt(ciphertext);

      expect(decrypted).toBeNull();
    });

    it('should decrypt multiple different encryptions of same plaintext', () => {
      const plaintext = 'test-token-456';

      const ciphertext1 = service.encrypt(plaintext);
      const ciphertext2 = service.encrypt(plaintext);

      const decrypted1 = service.decrypt(ciphertext1);
      const decrypted2 = service.decrypt(ciphertext2);

      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it('should throw error when decrypting invalid ciphertext', () => {
      const invalidCiphertext = 'invalid-base64-encrypted-data';

      expect(() => {
        service.decrypt(invalidCiphertext);
      }).toThrow();
    });

    it('should throw error when decrypting corrupted ciphertext', () => {
      const plaintext = 'test-token';
      const ciphertext = service.encrypt(plaintext);
      // Corrupt the ciphertext by removing some characters
      const corruptedCiphertext = ciphertext.substring(0, ciphertext.length - 10);

      expect(() => {
        service.decrypt(corruptedCiphertext);
      }).toThrow();
    });

    it('should maintain consistency - same plaintext encrypts differently but decrypts correctly', () => {
      const plaintext = 'test-token-consistency';
      
      // Encrypt same text multiple times
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);
      
      // Should be different (different IVs)
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same value
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });
  });

  describe('encrypt and decrypt roundtrip', () => {
    it('should encrypt and decrypt various token formats', () => {
      const tokens = [
        'VA_433676ab1f29f3364ae83cdbb73628f97ffb26c5c6488c826e50e32067f64057',
        'short-token',
        'very-long-token-with-many-characters-and-special-symbols-!@#$%^&*()',
        'token-with-numbers-1234567890',
        'token-with-unicode-测试-🚀',
      ];

      tokens.forEach((token) => {
        const encrypted = service.encrypt(token);
        const decrypted = service.decrypt(encrypted);

        expect(decrypted).toBe(token);
      });
    });

    it('should handle multiple encrypt/decrypt cycles', () => {
      const plaintext = 'test-token-multiple-cycles';

      for (let i = 0; i < 10; i++) {
        const encrypted = service.encrypt(plaintext);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      }
    });
  });
});

