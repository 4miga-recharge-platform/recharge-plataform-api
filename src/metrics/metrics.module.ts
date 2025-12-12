import { Module, forwardRef } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsCronService } from './metrics-cron.service';
import { MetricsController } from './metrics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [PrismaModule, forwardRef(() => OrderModule)],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsCronService],
  exports: [MetricsService],
})
export class MetricsModule {}

