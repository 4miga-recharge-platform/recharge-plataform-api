import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SseModule } from 'src/sse/sse.module';

@Module({
  imports: [PrismaModule, SseModule],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
