import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserCleanupService } from './user-cleanup.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [PrismaModule, EmailModule, OrderModule],
  controllers: [UserController],
  providers: [UserService, UserCleanupService],
  exports: [UserCleanupService],
})
export class UserModule {}
