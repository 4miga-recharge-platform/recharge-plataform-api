import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StoreModule } from './store/store.module';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { PackageModule } from './package/package.module';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    EmailModule,
    PrismaModule,
    StoreModule,
    UserModule,
    ProductModule,
    PackageModule,
    AuthModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
