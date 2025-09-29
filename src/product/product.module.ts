import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WebhookModule } from '../webhook/webhook.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, WebhookModule, StorageModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
