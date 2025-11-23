import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';

@Module({
  providers: [CryptoService],
  exports: [CryptoService], // Export for use in other modules
})
export class CryptoModule {}

