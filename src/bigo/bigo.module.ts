import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BigoController } from './bigo.controller';
import { BigoService } from './bigo.service';
import { BigoSignatureService } from './http/bigo-signature.service';
import { BigoRetryService } from './bigo-retry.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [BigoController],
  providers: [BigoService, BigoSignatureService, BigoRetryService],
})
export class BigoModule {}
