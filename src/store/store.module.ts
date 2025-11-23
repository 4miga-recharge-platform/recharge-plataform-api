import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { WebhookModule } from '../webhook/webhook.module';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [PrismaModule, StorageModule, WebhookModule, CryptoModule],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
