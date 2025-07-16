import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StoreModule } from './store/store.module';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { PackageModule } from './package/package.module';

@Module({
  imports: [PrismaModule, StoreModule, UserModule, ProductModule, PackageModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
