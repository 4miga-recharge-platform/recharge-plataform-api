import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StoreModule } from './store/store.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [PrismaModule, StoreModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
