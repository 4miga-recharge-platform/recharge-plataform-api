import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { validateRequiredFields, validateUpdateFields } from 'src/utils/validation.util';
import { StorageService } from '../storage/storage.service';
import { WebhookService } from '../webhook/webhook.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Store } from './entities/store.entity';

interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly webhookService: WebhookService,
  ) {}

  private storeSelect = {
    id: true,
    name: true,
    email: true,
    domain: true,
    wppNumber: true,
    instagramUrl: true,
    facebookUrl: true,
    tiktokUrl: true,
    logoUrl: true,
    miniLogoUrl: true,
    faviconUrl: true,
    bannersUrl: true,
    secondaryBannerUrl: true,
    createdAt: false,
    updatedAt: false,
    users: false,
    packages: false,
    orders: false,
  };

  // master admin only access
  async findAll(): Promise<Store[]> {
    try {
      const data = await this.prisma.store.findMany({
        select: this.storeSelect,
      });
      return data;
    } catch {
      throw new BadRequestException('Failed to fetch stores');
    }
  }

  async findOne(id: string): Promise<Store> {
    try {
      const data = await this.prisma.store.findUnique({
        where: { id },
        select: this.storeSelect,
      });
      if (!data) {
        throw new BadRequestException('Store not found');
      }
      return data;
    } catch {
      throw new BadRequestException('Failed to fetch store');
    }
  }

  async create(dto: CreateStoreDto): Promise<Store> {
    try {
      validateRequiredFields(dto, ['name']);
      const store = await this.prisma.store.create({
        data: dto,
        select: this.storeSelect,
      });

      return store;
    } catch {
      throw new BadRequestException('Failed to create store');
    }
  }

  async update(id: string, dto: UpdateStoreDto): Promise<Store> {
    try {
      await this.findOne(id);
      const fieldsToValidate = Object.keys(dto).filter(
        (key) => dto[key] !== undefined,
      );
      validateUpdateFields(dto, fieldsToValidate);
      const store = await this.prisma.store.update({
        where: { id },
        data: dto,
        select: this.storeSelect,
      });

      return store;
    } catch {
      throw new BadRequestException('Failed to update store');
    }
  }

  async remove(id: string): Promise<Store> {
    try {
      await this.findOne(id);
      const store = await this.prisma.store.delete({
        where: { id },
        select: this.storeSelect,
      });

      return store;
    } catch {
      throw new BadRequestException('Failed to remove store');
    }
  }

  async addBanner(storeId: string, file: FileUpload) {
    try {
      if (!file) {
        throw new BadRequestException('File is required');
      }

      // Validate store exists
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, bannersUrl: true },
      });
      if (!store) throw new BadRequestException('Store not found');

      // Check banner limit (max 5)
      const currentBanners = store.bannersUrl || [];
      if (currentBanners.length >= 5) {
        throw new BadRequestException('Maximum of 5 banners allowed');
      }

      // Decide deterministic filename and path
      const allowedExts = ['png', 'jpg', 'jpeg', 'webp'];
      const originalExt = (
        file.originalname.split('.').pop() || ''
      ).toLowerCase();
      const mimeToExt: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
      };
      const mimeExt = mimeToExt[file.mimetype] || '';
      let ext = originalExt || mimeExt || 'png';
      if (!allowedExts.includes(ext)) {
        ext = mimeExt && allowedExts.includes(mimeExt) ? mimeExt : 'png';
      }
      const timestamp = Date.now();
      const desiredFileName = `banner-${timestamp}.${ext}`;
      const folderPath = `store/${storeId}/banners`;

      const fileUrl = await this.storageService.uploadFile(
        file,
        folderPath,
        desiredFileName,
      );

      // Add to banners array
      const updatedBanners = [...currentBanners, fileUrl];

      const updated = await this.prisma.store.update({
        where: { id: storeId },
        data: { bannersUrl: updatedBanners },
        select: this.storeSelect,
      });

      return {
        success: true,
        store: updated,
        bannersUrl: updatedBanners,
        message: 'Banner added successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to add banner');
    }
  }

  async removeBanner(storeId: string, bannerIndex: number) {
    try {
      // Validate store exists
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, bannersUrl: true },
      });
      if (!store) throw new BadRequestException('Store not found');

      const currentBanners = store.bannersUrl || [];
      if (bannerIndex >= currentBanners.length || bannerIndex < 0) {
        throw new BadRequestException('Invalid banner index');
      }

      // Get banner URL to delete from storage
      const bannerUrlToDelete = currentBanners[bannerIndex];

      // Delete from storage
      try {
        await this.storageService.deleteFile(bannerUrlToDelete);
        this.logger.log(`Banner deleted from storage: ${bannerUrlToDelete}`);
      } catch (err) {
        this.logger.warn(
          `Could not delete banner from storage: ${err.message}`,
        );
      }

      // Remove from array (array will automatically reorder)
      const updatedBanners = currentBanners.filter(
        (_, index) => index !== bannerIndex,
      );

      const updated = await this.prisma.store.update({
        where: { id: storeId },
        data: { bannersUrl: updatedBanners },
        select: this.storeSelect,
      });

      return {
        success: true,
        store: updated,
        bannersUrl: updatedBanners,
        message: 'Banner removed successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to remove banner');
    }
  }

  async removeMultipleBanners(storeId: string, indices: number[]) {
    try {
      if (!indices || indices.length === 0) {
        throw new BadRequestException('Indices are required');
      }

      // Validate store exists
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, bannersUrl: true },
      });
      if (!store) throw new BadRequestException('Store not found');

      const currentBanners = store.bannersUrl || [];
      const maxIndex = currentBanners.length - 1;

      // Validate indices and separate valid from invalid
      const validIndices: number[] = [];
      const invalidIndices: number[] = [];

      indices.forEach((index) => {
        if (index >= 0 && index <= maxIndex) {
          validIndices.push(index);
        } else {
          invalidIndices.push(index);
        }
      });

      if (validIndices.length === 0) {
        throw new BadRequestException('No valid indices provided');
      }

      // Get banner URLs to delete from storage
      const bannerUrlsToDelete = validIndices.map(
        (index) => currentBanners[index],
      );

      // Delete from storage (ignore failures)
      const deletePromises = bannerUrlsToDelete.map((url) =>
        this.storageService
          .deleteFile(url)
          .then(() => ({ success: true, url }))
          .catch((err) => {
            this.logger.warn(
              `Could not delete banner from storage: ${err.message}`,
            );
            return { success: false, url, error: err.message };
          }),
      );

      await Promise.all(deletePromises);

      // Remove from array (sort indices in descending order to avoid index shifting issues)
      const sortedValidIndices = [...validIndices].sort((a, b) => b - a);
      let updatedBanners = [...currentBanners];

      sortedValidIndices.forEach((index) => {
        updatedBanners.splice(index, 1);
      });

      const updated = await this.prisma.store.update({
        where: { id: storeId },
        data: { bannersUrl: updatedBanners },
        select: this.storeSelect,
      });

      return {
        success: true,
        store: updated,
        bannersUrl: updatedBanners,
        removedCount: validIndices.length,
        invalidIndices,
        message:
          invalidIndices.length > 0
            ? `Removed ${validIndices.length} banners. ${invalidIndices.length} invalid indices ignored.`
            : 'Banners removed successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to remove multiple banners');
    }
  }

  async addMultipleBanners(storeId: string, files: FileUpload[]) {
    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('Files are required');
      }

      // Validate store exists
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, bannersUrl: true },
      });
      if (!store) throw new BadRequestException('Store not found');

      const currentBanners = store.bannersUrl || [];
      const maxBanners = 5;

      if (currentBanners.length >= maxBanners) {
        throw new BadRequestException('Maximum of 5 banners allowed');
      }

      // Only process up to remaining slots
      const remainingSlots = maxBanners - currentBanners.length;
      const filesToProcess = files.slice(0, remainingSlots);

      const folderPath = `store/${storeId}/banners`;
      const allowedExts = ['png', 'jpg', 'jpeg', 'webp'];
      const mimeToExt: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
      };

      const uploadPromises = filesToProcess.map((file) => {
        const originalExt = (
          file.originalname.split('.').pop() || ''
        ).toLowerCase();
        const mimeExt = mimeToExt[file.mimetype] || '';
        let ext = originalExt || mimeExt || 'png';
        if (!allowedExts.includes(ext)) {
          ext = mimeExt && allowedExts.includes(mimeExt) ? mimeExt : 'png';
        }
        const desiredFileName = `banner-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        return this.storageService
          .uploadFile(file, folderPath, desiredFileName)
          .then((url) => ({ ok: true, url, name: file.originalname }))
          .catch((err) => ({
            ok: false,
            error: String(err?.message || err),
            name: file.originalname,
          }));
      });

      const results = await Promise.all(uploadPromises);

      const successUrls = results
        .filter((r) => r.ok)
        .map((r: any) => r.url as string);
      const failures = results
        .filter((r) => !r.ok)
        .map((r: any) => ({ name: r.name, error: r.error }));

      const updatedBanners = [...currentBanners, ...successUrls];

      const updated = await this.prisma.store.update({
        where: { id: storeId },
        data: { bannersUrl: updatedBanners },
        select: this.storeSelect,
      });

      return {
        success: true,
        store: updated,
        bannersUrl: updatedBanners,
        uploadedCount: successUrls.length,
        failedCount: failures.length,
        failures,
        message: failures.length
          ? 'Some banners failed to upload'
          : 'Banners uploaded successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to upload multiple banners');
    }
  }

  async uploadOfferBanner(storeId: string, file: FileUpload) {
    try {
      if (!file) {
        throw new BadRequestException('File is required');
      }

      // Validate store exists
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, secondaryBannerUrl: true },
      });
      if (!store) throw new BadRequestException('Store not found');

      // Delete previous offer banner image if exists
      if (store.secondaryBannerUrl) {
        try {
          await this.storageService.deleteFile(store.secondaryBannerUrl);
          this.logger.log(
            `Previous offer banner deleted: ${store.secondaryBannerUrl}`,
          );
        } catch (err) {
          this.logger.warn(
            `Could not delete previous offer banner: ${err.message}`,
          );
        }
      }

      // Decide deterministic filename and path
      const allowedExts = ['png', 'jpg', 'jpeg', 'webp'];
      const originalExt = (
        file.originalname.split('.').pop() || ''
      ).toLowerCase();
      const mimeToExt: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
      };
      const mimeExt = mimeToExt[file.mimetype] || '';
      let ext = originalExt || mimeExt || 'png';
      if (!allowedExts.includes(ext)) {
        ext = mimeExt && allowedExts.includes(mimeExt) ? mimeExt : 'png';
      }
      const timestamp = Date.now();
      const desiredFileName = `offer-banner-${timestamp}.${ext}`;
      const folderPath = `store/${storeId}/offer-banner`;

      const fileUrl = await this.storageService.uploadFile(
        file,
        folderPath,
        desiredFileName,
      );

      // Update store with new offer banner image
      const updated = await this.prisma.store.update({
        where: { id: storeId },
        data: { secondaryBannerUrl: fileUrl },
        select: this.storeSelect,
      });

      return {
        success: true,
        store: updated,
        secondaryBannerUrl: fileUrl,
        message: 'Offer banner uploaded successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to upload offer banner');
    }
  }

  async removeOfferBanner(storeId: string) {
    try {
      this.logger.log(`Removing offer banner for store: ${storeId}`);

      // Validate store exists and get current secondaryBannerUrl
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, secondaryBannerUrl: true },
      });
      if (!store) {
        this.logger.error(`Store not found: ${storeId}`);
        throw new BadRequestException('Store not found');
      }

      // Delete image from storage if exists
      if (store.secondaryBannerUrl) {
        try {
          await this.storageService.deleteFile(store.secondaryBannerUrl);
          this.logger.log(
            `Offer banner deleted from storage: ${store.secondaryBannerUrl}`,
          );
        } catch (err) {
          this.logger.warn(
            `Could not delete offer banner from storage: ${err.message}`,
          );
        }
      }

      // Update store to set secondaryBannerUrl as null
      const updated = await this.prisma.store.update({
        where: { id: storeId },
        data: { secondaryBannerUrl: null },
        select: this.storeSelect,
      });

      return {
        success: true,
        store: updated,
        secondaryBannerUrl: null,
        message: 'Offer banner removed successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to remove offer banner');
    }
  }

  /**
   * Get dashboard data for a store
   * Returns consolidated metrics: summary, daily trend, and sales by product
   *
   * @param storeId - The store ID
   * @param period - Period to fetch data for. Options:
   *   - "current_month" (default) - Current month
   *   - "2024-01" - Specific month (format: YYYY-MM)
   *   - "last_7_days" - Last 7 days
   *   - "last_30_days" - Last 30 days
   *
   * @returns Dashboard data with summary, daily trend, and sales by product
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
      period: string; // "YYYY-MM"
    } | null;
  }> {
    try {
      // Validate store exists
      await this.findOne(storeId);

      const now = new Date();
      let targetYear: number;
      let targetMonth: number;
      let periodType = 'current_month';
      let startDate: Date;
      let endDate: Date;

      // Parse period parameter
      if (!period || period === 'current_month') {
        targetYear = now.getFullYear();
        targetMonth = now.getMonth() + 1; // getMonth() returns 0-11
        startDate = new Date(targetYear, targetMonth - 1, 1);
        endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
      } else if (period.match(/^\d{4}-\d{2}$/)) {
        // Format: YYYY-MM
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
      const [monthlySales, salesByProduct, dailySales, firstAvailablePeriodData] = await Promise.all([
        // Get monthly sales (summary)
        this.prisma.storeMonthlySales.findFirst({
          where: {
            storeId,
            year: targetYear,
            month: targetMonth,
          },
        }),

        // Get sales by product for the month
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
                imgCardUrl: true, // ADICIONAR imgCardUrl
              },
            },
          },
          orderBy: {
            totalSales: 'desc',
          },
        }),

        // Get daily sales (last 7 days)
        this.prisma.storeDailySales.findMany({
          where: {
            storeId,
            date: {
              gte: new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() - 6,
              ), // Last 7 days including today
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

        // Get first available period (oldest record)
        this.prisma.storeMonthlySales.findFirst({
          where: {
            storeId,
          },
          select: {
            year: true,
            month: true,
          },
          orderBy: [
            { year: 'asc' },
            { month: 'asc' },
          ],
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
            totalCustomers: monthlySales.totalCustomers,
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
        date: daily.date.toISOString().split('T')[0], // Format: YYYY-MM-DD
        totalSales: Number(daily.totalSales),
        totalOrders: daily.totalOrders,
      }));

      // Get product IDs to fetch store customizations
      const productIds = salesByProduct.map((sale) => sale.productId);

      // Fetch store product settings (customizations) for these products
      const storeProductSettings = productIds.length > 0
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

      // Create a map for quick lookup: productId -> custom imgCardUrl
      const storeImageMap = new Map<string, string>();
      for (const setting of storeProductSettings) {
        if (setting.imgCardUrl) {
          storeImageMap.set(setting.productId, setting.imgCardUrl);
        }
      }

      // Prepare sales by product with image (prioritize store customization, fallback to product default)
      const totalSalesAmount = summary.totalSales;
      const salesByProductData = salesByProduct.map((sale) => {
        // Priority: StoreProductSettings.imgCardUrl > Product.imgCardUrl
        const imgCardUrl = storeImageMap.get(sale.productId) ?? sale.product.imgCardUrl ?? '';

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

      // Prepare first available period
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
