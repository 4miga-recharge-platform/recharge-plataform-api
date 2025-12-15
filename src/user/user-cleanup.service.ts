import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { getHoursAgoInBrazil } from '../utils/date.util';

@Injectable()
export class UserCleanupService {
  private readonly logger = new Logger(UserCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 0 */2 * *')
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
      } else {
        this.logger.log(
          `Found ${unverifiedUsers.length} unverified users to delete`,
        );

        // Delete unverified users
        const deleteResult = await this.prisma.user.deleteMany({
          where: {
            emailVerified: false,
            emailConfirmationExpires: {
              lt: now,
            },
          },
        });

        this.logger.log(
          `Successfully deleted ${deleteResult.count} unverified users`,
        );

        // Log details of deleted users for monitoring
        unverifiedUsers.forEach((user) => {
          this.logger.log(
            `Deleted unverified user: ${user.email} (${user.name}) - Created: ${user.createdAt}`,
          );
        });
      }
    } catch (error) {
      this.logger.error('Error during cleanup of unverified users:', error);
    }
  }

  /**
   * Expire orders that have been unpaid for more than 24 hours
   * Manual method for testing or immediate execution
   * Note: Order expiration is now handled by OrderService.checkAndExpireOrders()
   * and the metrics cron job
   */
  async expireUnpaidOrders(): Promise<void> {
    this.logger.log('Starting expiration of unpaid orders...');

    try {
      const twentyFourHoursAgo = getHoursAgoInBrazil(24);

      // Find orders that:
      // 1. Are in CREATED status (not PROCESSING - payment already approved)
      // 2. Have PAYMENT_PENDING status
      // 3. Were created more than 24 hours ago
      const unpaidOrders = await this.prisma.order.findMany({
        where: {
          orderStatus: OrderStatus.CREATED, // Only CREATED, not PROCESSING
          payment: {
            status: PaymentStatus.PAYMENT_PENDING,
          },
          createdAt: {
            lt: twentyFourHoursAgo,
          },
        },
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          storeId: true,
        },
      });

      if (unpaidOrders.length === 0) {
        this.logger.log('No unpaid orders to expire');
        return;
      }

      this.logger.log(
        `Found ${unpaidOrders.length} unpaid orders to expire`,
      );

      let expiredCount = 0;
      let errorCount = 0;

      // Expire each order individually to ensure metrics are updated correctly
      for (const order of unpaidOrders) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // Update order status to EXPIRED
            await tx.order.update({
              where: { id: order.id },
              data: {
                orderStatus: OrderStatus.EXPIRED,
                updatedAt: new Date(),
              },
            });
          });

          expiredCount++;
          this.logger.log(
            `Expired order ${order.orderNumber} (ID: ${order.id}) - Created: ${order.createdAt}`,
          );
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Error expiring order ${order.orderNumber} (ID: ${order.id}): ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Successfully expired ${expiredCount} orders. Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error('Error during expiration of unpaid orders:', error);
    }
  }

  // Manual cleanup method for testing or immediate execution
  async manualCleanup() {
    this.logger.log('Manual cleanup triggered');
    await this.cleanupUnverifiedUsers();
  }

  // Manual expiration method for testing or immediate execution
  async manualExpireOrders() {
    this.logger.log('Manual order expiration triggered');
    await this.expireUnpaidOrders();
  }
}
