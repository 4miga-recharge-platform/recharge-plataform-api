import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BigoModule } from './bigo/bigo.module';
import { BraviveModule } from './bravive/bravive.module';
import { CouponModule } from './coupon/coupon.module';
import { EmailModule } from './email/email.module';
import { InfluencerModule } from './influencer/influencer.module';
import { OrderModule } from './order/order.module';
import { PackageModule } from './package/package.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { StoreModule } from './store/store.module';
import { UserModule } from './user/user.module';
import { SseModule } from './sse/sse.module';
import { StorageModule } from './storage/storage.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EmailModule,
    PrismaModule,
    StoreModule,
    UserModule,
    ProductModule,
    PackageModule,
    AuthModule,
    OrderModule,
    BigoModule,
    BraviveModule,
    SseModule,
    InfluencerModule,
    CouponModule,
    StorageModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
