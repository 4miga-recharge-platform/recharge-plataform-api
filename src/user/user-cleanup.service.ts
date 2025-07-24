import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserCleanupService {
  private readonly logger = new Logger(UserCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupUnverifiedUsers() {
    this.logger.log('Starting cleanup of unverified users...');

    try {
      const now = new Date();

      // Find users that are not verified and their confirmation has expired
      const unverifiedUsers = await this.prisma.user.findMany({
        where: {
          emailVerified: false,
          emailConfirmationExpires: {
            lt: now,
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      if (unverifiedUsers.length === 0) {
        this.logger.log('No unverified users to clean up');
        return;
      }

      this.logger.log(`Found ${unverifiedUsers.length} unverified users to delete`);

      // Delete unverified users
      const deleteResult = await this.prisma.user.deleteMany({
        where: {
          emailVerified: false,
          emailConfirmationExpires: {
            lt: now,
          },
        },
      });

      this.logger.log(`Successfully deleted ${deleteResult.count} unverified users`);

      // Log details of deleted users for monitoring
      unverifiedUsers.forEach(user => {
        this.logger.log(`Deleted unverified user: ${user.email} (${user.name}) - Created: ${user.createdAt}`);
      });

    } catch (error) {
      this.logger.error('Error during cleanup of unverified users:', error);
    }
  }

  // Manual cleanup method for testing or immediate execution
  async manualCleanup() {
    this.logger.log('Manual cleanup triggered');
    await this.cleanupUnverifiedUsers();
  }
}
