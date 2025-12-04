import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BraviveController } from './bravive.controller';
import { BraviveService } from './bravive.service';
import { BraviveHttpService } from './http/bravive-http.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BigoModule } from '../bigo/bigo.module';
import { OrderModule } from '../order/order.module';
import { StoreModule } from '../store/store.module';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    BigoModule,
    forwardRef(() => OrderModule), // Use forwardRef to avoid circular dependency
    StoreModule,
  ],
  controllers: [BraviveController],
  providers: [BraviveService, BraviveHttpService],
  exports: [BraviveService], // Export for use in other modules (e.g., OrderModule)
})
export class BraviveModule {}

