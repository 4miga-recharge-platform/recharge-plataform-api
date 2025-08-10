import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BigoModule } from './bigo/bigo.module';
import { EmailModule } from './email/email.module';
import { OrderModule } from './order/order.module';
import { PackageModule } from './package/package.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { StoreModule } from './store/store.module';
import { UserModule } from './user/user.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
