import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BigoController } from './bigo.controller';
import { BigoService } from './bigo.service';
import { BigoHttpService } from './http/bigo-http.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 0,
    }),
    PrismaModule,
  ],
  controllers: [BigoController],
  providers: [BigoService, BigoHttpService],
  exports: [BigoService],
})
export class BigoModule {}
