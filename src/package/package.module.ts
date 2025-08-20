import { Module } from '@nestjs/common';
import { PackageService } from './package.service';
import { PackageController } from './package.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SseModule } from 'src/sse/sse.module';

@Module({
  imports: [PrismaModule, SseModule],
  controllers: [PackageController],
  providers: [PackageService],
})
export class PackageModule {}
