import { Module } from '@nestjs/common';
import { SseController } from './sse.controller';
import { SseConfirmEmailService } from './sse.confirm-email.service';

@Module({
  controllers: [SseController],
  providers: [SseConfirmEmailService],
  exports: [SseConfirmEmailService],
})
export class SseModule {}
