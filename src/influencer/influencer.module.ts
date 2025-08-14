import { Module } from '@nestjs/common';
import { InfluencerService } from './influencer.service';
import { InfluencerController } from './influencer.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InfluencerController],
  providers: [InfluencerService],
  exports: [InfluencerService],
})
export class InfluencerModule {}
