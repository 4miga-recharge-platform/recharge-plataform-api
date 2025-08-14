import { generateKeyPairSync } from 'crypto';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Generate RSA key pair for Bigo API testing
 */
function generateBigoKeys(): { privateKey: string; publicKey: string } {
  console.log('🔑 Generating RSA key pair for Bigo API...\n');

  try {
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

    // Create keys directory if it doesn't exist
    const keysDir = join(__dirname, '..', 'keys');
    if (!existsSync(keysDir)) {
      mkdirSync(keysDir, { recursive: true });
    }

    // Save private key
    const privateKeyPath = join(keysDir, 'bigo-private-key.pem');
    writeFileSync(privateKeyPath, privateKey);
    console.log('✅ Private key saved to:', privateKeyPath);

    // Save public key
    const publicKeyPath = join(keysDir, 'bigo-public-key.pem');
    writeFileSync(publicKeyPath, publicKey);
    console.log('✅ Public key saved to:', publicKeyPath);

    console.log('\n📋 Next steps:');
    console.log('1. Add the private key to your .env file');
    console.log('2. Send the public key to Bigo for verification');
    console.log('3. Test with: GET /bigo/test-signature');

    return { privateKey, publicKey };
  } catch (error) {
    console.error('❌ Error generating keys:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateBigoKeys();
}

export { generateBigoKeys };
