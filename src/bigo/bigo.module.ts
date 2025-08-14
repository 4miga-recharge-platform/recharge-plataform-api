import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BigoController } from './bigo.controller';
import { BigoService } from './bigo.service';
import { BigoSignatureService } from './http/bigo-signature.service';

@Module({
  imports: [HttpModule],
  controllers: [BigoController],
  providers: [BigoService, BigoSignatureService],
})
export class BigoModule {}
