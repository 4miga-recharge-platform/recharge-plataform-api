import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserCleanupService } from './user-cleanup.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [UserController],
  providers: [UserService, UserCleanupService],
  exports: [UserCleanupService],
})
export class UserModule {}
