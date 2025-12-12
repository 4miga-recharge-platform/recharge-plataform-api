import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { OrderService } from '../order/order.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {}

  /**
   * Recalculates all metrics for a store for a specific date
   * Updates StoreDailySales, StoreMonthlySales and StoreMonthlySalesByProduct
   */
  async recalculateStoreMetrics(
    storeId: string,
    targetDate: Date,
  ): Promise<void> {
    const dateOnly = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );

    const month = dateOnly.getMonth() + 1;
    const year = dateOnly.getFullYear();

    // Expire unpaid orders for this store before calculating metrics
    // This ensures metrics are calculated with correct order statuses
    await this.orderService.checkAndExpireOrders(storeId, undefined, dateOnly);

    // Recalculate daily metrics
    await this.recalculateDailyMetrics(storeId, dateOnly);

    // Recalculate monthly metrics
    await this.recalculateMonthlyMetrics(storeId, month, year);

    // Recalculate monthly metrics by product
    await this.recalculateMonthlyByProductMetrics(storeId, month, year);
  }

  /**
   * Recalculates daily metrics for a specific date
   */
  private async recalculateDailyMetrics(
    storeId: string,
    targetDate: Date,
  ): Promise<void> {
    const dateOnly = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );
    const nextDay = new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000);

    // Find all orders created on the date
    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        createdAt: {
          gte: dateOnly,
          lt: nextDay,
        },
      },
      select: {
        id: true,
        price: true,
        orderStatus: true,
      },
    });

    // Calculate totalOrders (all orders created)
    const totalOrders = orders.length;

    // Calculate totalSales (only COMPLETED orders - current status)
    // If an order was refunded later, it's no longer COMPLETED
    const totalSales = orders.reduce((sum, order) => {
      if (order.orderStatus === OrderStatus.COMPLETED) {
        return sum + Number(order.price);
      }
      return sum;
    }, 0);

    // Upsert StoreDailySales
    await this.prisma.storeDailySales.upsert({
      where: {
        storeId_date: {
          storeId,
          date: dateOnly,
        },
      },
      create: {
        storeId,
        date: dateOnly,
        totalSales: totalSales > 0 ? totalSales : 0,
        totalOrders,
      },
      update: {
        totalSales: totalSales > 0 ? totalSales : 0,
        totalOrders,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Recalculates monthly metrics for a specific month/year
   */
  private async recalculateMonthlyMetrics(
    storeId: string,
    month: number,
    year: number,
  ): Promise<void> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Find all orders from the month
    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        couponUsages: {
          select: {
            id: true,
          },
        },
      },
    });

    // Calculate metrics based on CURRENT status of each order
    const totalOrders = orders.length;
    let totalSales = 0;
    let totalCompletedOrders = 0;
    let totalExpiredOrders = 0;
    let totalRefundedOrders = 0;
    let ordersWithCoupon = 0;
    let ordersWithoutCoupon = 0;

    for (const order of orders) {
      const hasCoupon = order.couponUsages.length > 0;

      switch (order.orderStatus) {
        case OrderStatus.COMPLETED:
          // Order is completed and not refunded (if refunded, status would be REFOUNDED)
          totalCompletedOrders++;
          totalSales += Number(order.price);
          if (hasCoupon) {
            ordersWithCoupon++;
          } else {
            ordersWithoutCoupon++;
          }
          break;
        case OrderStatus.EXPIRED:
          totalExpiredOrders++;
          break;
        case OrderStatus.REFOUNDED:
          // Order was refunded (may have been completed before, but now is refunded)
          totalRefundedOrders++;
          break;
        // CREATED and PROCESSING don't count for final metrics
      }
    }

    // Calculate newCustomers (users who confirmed email in the month)
    const newCustomers = await this.prisma.user.count({
      where: {
        storeId,
        emailVerified: true,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Upsert StoreMonthlySales
    await this.prisma.storeMonthlySales.upsert({
      where: {
        storeId_month_year: {
          storeId,
          month,
          year,
        },
      },
      create: {
        storeId,
        month,
        year,
        totalSales: totalSales > 0 ? totalSales : 0,
        totalOrders,
        totalCompletedOrders,
        totalExpiredOrders,
        totalRefundedOrders,
        newCustomers,
        ordersWithCoupon,
        ordersWithoutCoupon,
      },
      update: {
        totalSales: totalSales > 0 ? totalSales : 0,
        totalOrders,
        totalCompletedOrders,
        totalExpiredOrders,
        totalRefundedOrders,
        newCustomers,
        ordersWithCoupon,
        ordersWithoutCoupon,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Recalculates monthly metrics by product
   */
  private async recalculateMonthlyByProductMetrics(
    storeId: string,
    month: number,
    year: number,
  ): Promise<void> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Find orders from the month with their products
    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        orderItem: {
          select: {
            productId: true,
          },
        },
      },
    });

    // Group by product
    const productMetrics = new Map<
      string,
      { totalSales: number; totalOrders: number }
    >();

    for (const order of orders) {
      const productId = order.orderItem?.productId;
      if (!productId) continue;

      if (!productMetrics.has(productId)) {
        productMetrics.set(productId, { totalSales: 0, totalOrders: 0 });
      }

      const metrics = productMetrics.get(productId)!;
      metrics.totalOrders++;

      // Only count sales for COMPLETED orders (current status)
      // If refunded later, status will already be REFOUNDED
      if (order.orderStatus === OrderStatus.COMPLETED) {
        metrics.totalSales += Number(order.price);
      }
    }

    // Upsert for each product
    for (const [productId, metrics] of productMetrics.entries()) {
      await this.prisma.storeMonthlySalesByProduct.upsert({
        where: {
          storeId_productId_month_year: {
            storeId,
            productId,
            month,
            year,
          },
        },
        create: {
          storeId,
          productId,
          month,
          year,
          totalSales: metrics.totalSales > 0 ? metrics.totalSales : 0,
          totalOrders: metrics.totalOrders,
        },
        update: {
          totalSales: metrics.totalSales > 0 ? metrics.totalSales : 0,
          totalOrders: metrics.totalOrders,
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Get dashboard data for a store
   * Returns consolidated metrics: summary, daily trend, and sales by product
   */
  async getDashboardData(
    storeId: string,
    period?: string,
  ): Promise<{
    period: {
      type: string;
      year?: number;
      month?: number;
      startDate?: string;
      endDate?: string;
    };
    summary: {
      totalSales: number;
      totalOrders: number;
      totalCompletedOrders: number;
      totalExpiredOrders: number;
      totalRefundedOrders: number;
      averageTicket: number;
      totalCustomers: number;
      newCustomers: number;
      ordersWithCoupon: number;
      ordersWithoutCoupon: number;
    };
    dailyTrend: Array<{
      date: string;
      totalSales: number;
      totalOrders: number;
    }>;
    salesByProduct: Array<{
      productId: string;
      productName: string;
      imgCardUrl: string;
      totalSales: number;
      totalOrders: number;
      percentage: number;
    }>;
    firstAvailablePeriod: {
      year: number;
      month: number;
      period: string;
    } | null;
    cronHealthStatus: 'OK' | 'WARNING' | 'ERROR';
  }> {
    try {
      // Validate store exists
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true },
      });

      if (!store) {
        throw new BadRequestException('Store not found');
      }

      const now = new Date();
      let targetYear: number;
      let targetMonth: number;
      let periodType = 'current_month';
      let startDate: Date;
      let endDate: Date;

      // Parse period parameter
      if (!period || period === 'current_month') {
        targetYear = now.getFullYear();
        targetMonth = now.getMonth() + 1;
        startDate = new Date(targetYear, targetMonth - 1, 1);
        endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
      } else if (period.match(/^\d{4}-\d{2}$/)) {
        const [year, month] = period.split('-').map(Number);
        targetYear = year;
        targetMonth = month;
        periodType = period;
        startDate = new Date(targetYear, targetMonth - 1, 1);
        endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
      } else if (period === 'last_7_days') {
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setDate(endDate.getDate() - 7);
        targetYear = now.getFullYear();
        targetMonth = now.getMonth() + 1;
        periodType = 'last_7_days';
      } else if (period === 'last_30_days') {
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setDate(endDate.getDate() - 30);
        targetYear = now.getFullYear();
        targetMonth = now.getMonth() + 1;
        periodType = 'last_30_days';
      } else {
        throw new BadRequestException(
          `Invalid period format. Use: "current_month", "YYYY-MM", "last_7_days", or "last_30_days"`,
        );
      }

      // Fetch data in parallel
      const [
        monthlySales,
        salesByProduct,
        dailySales,
        firstAvailablePeriodData,
        totalCustomersCount,
      ] = await Promise.all([
        this.prisma.storeMonthlySales.findFirst({
          where: {
            storeId,
            year: targetYear,
            month: targetMonth,
          },
        }),
        this.prisma.storeMonthlySalesByProduct.findMany({
          where: {
            storeId,
            year: targetYear,
            month: targetMonth,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imgCardUrl: true,
              },
            },
          },
          orderBy: {
            totalSales: 'desc',
          },
        }),
        this.prisma.storeDailySales.findMany({
          where: {
            storeId,
            date: {
              gte: new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() - 6,
              ),
              lte: new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + 1,
              ),
            },
          },
          orderBy: {
            date: 'desc',
          },
          take: 7,
        }),
        this.prisma.storeMonthlySales.findFirst({
          where: {
            storeId,
          },
          select: {
            year: true,
            month: true,
          },
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
        }),
        this.prisma.user.count({
          where: {
            storeId,
            createdAt: {
              lte: endDate,
            },
          },
        }),
      ]);

      // Prepare summary
      const summary = monthlySales
        ? {
            totalSales: Number(monthlySales.totalSales),
            totalOrders: monthlySales.totalOrders,
            totalCompletedOrders: monthlySales.totalCompletedOrders,
            totalExpiredOrders: monthlySales.totalExpiredOrders,
            totalRefundedOrders: monthlySales.totalRefundedOrders,
            averageTicket:
              monthlySales.totalCompletedOrders > 0
                ? Number(monthlySales.totalSales) /
                  monthlySales.totalCompletedOrders
                : 0,
            totalCustomers: totalCustomersCount,
            newCustomers: monthlySales.newCustomers,
            ordersWithCoupon: monthlySales.ordersWithCoupon,
            ordersWithoutCoupon: monthlySales.ordersWithoutCoupon,
          }
        : {
            totalSales: 0,
            totalOrders: 0,
            totalCompletedOrders: 0,
            totalExpiredOrders: 0,
            totalRefundedOrders: 0,
            averageTicket: 0,
            totalCustomers: 0,
            newCustomers: 0,
            ordersWithCoupon: 0,
            ordersWithoutCoupon: 0,
          };

      // Prepare daily trend
      const dailyTrend = dailySales.map((daily) => ({
        date: daily.date.toISOString().split('T')[0],
        totalSales: Number(daily.totalSales),
        totalOrders: daily.totalOrders,
      }));

      // Get product IDs to fetch store customizations
      const productIds = salesByProduct.map((sale) => sale.productId);

      const storeProductSettings =
        productIds.length > 0
          ? await this.prisma.storeProductSettings.findMany({
              where: {
                storeId,
                productId: { in: productIds },
              },
              select: {
                productId: true,
                imgCardUrl: true,
              },
            })
          : [];

      const storeImageMap = new Map<string, string>();
      for (const setting of storeProductSettings) {
        if (setting.imgCardUrl) {
          storeImageMap.set(setting.productId, setting.imgCardUrl);
        }
      }

      const totalSalesAmount = summary.totalSales;
      const salesByProductData = salesByProduct.map((sale) => {
        const imgCardUrl =
          storeImageMap.get(sale.productId) ?? sale.product.imgCardUrl ?? '';

        return {
          productId: sale.productId,
          productName: sale.product.name,
          imgCardUrl,
          totalSales: Number(sale.totalSales),
          totalOrders: sale.totalOrders,
          percentage:
            totalSalesAmount > 0
              ? (Number(sale.totalSales) / totalSalesAmount) * 100
              : 0,
        };
      });

      const firstAvailablePeriod = firstAvailablePeriodData
        ? {
            year: firstAvailablePeriodData.year,
            month: firstAvailablePeriodData.month,
            period: `${firstAvailablePeriodData.year}-${String(firstAvailablePeriodData.month).padStart(2, '0')}`,
          }
        : null;

      return {
        period: {
          type: periodType,
          year: targetYear,
          month: targetMonth,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
        summary,
        dailyTrend,
        salesByProduct: salesByProductData,
        firstAvailablePeriod,
        cronHealthStatus: 'OK', // Será preenchido pelo controller
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error fetching dashboard data:', error);
      throw new BadRequestException('Failed to fetch dashboard data');
    }
  }
}

