import { Module } from '@nestjs/common';
import { InfluencerService } from './influencer.service';
import { InfluencerController } from './influencer.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CouponModule } from '../coupon/coupon.module';

@Module({
  imports: [PrismaModule, CouponModule],
  controllers: [InfluencerController],
  providers: [InfluencerService],
  exports: [InfluencerService],
})
export class InfluencerModule {}
