import { Module, forwardRef } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BraviveModule } from '../bravive/bravive.module';
import { StoreModule } from '../store/store.module';
import { BigoModule } from '../bigo/bigo.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => BraviveModule), // Use forwardRef to avoid circular dependency
    StoreModule,
    BigoModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService], // Export for use in other modules (e.g., BraviveModule)
})
export class OrderModule {}
