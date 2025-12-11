import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsCronService } from './metrics-cron.service';
import { MetricsController } from './metrics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsCronService],
  exports: [MetricsService],
})
export class MetricsModule {}

