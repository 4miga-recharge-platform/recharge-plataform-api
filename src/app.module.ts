import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StoreModule } from './store/store.module';

@Module({
  imports: [PrismaModule, StoreModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
