import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { validateRequiredFields } from 'src/utils/validation.util';
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
    offerBannerImage: true,
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
      validateRequiredFields(dto, ['name', 'email']);
      return await this.prisma.store.create({
        data: dto,
        select: this.storeSelect,
      });
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
      validateRequiredFields(dto, fieldsToValidate);
      return await this.prisma.store.update({
        where: { id },
        data: dto,
        select: this.storeSelect,
      });
    } catch {
      throw new BadRequestException('Failed to update store');
    }
  }

  async remove(id: string): Promise<Store> {
    try {
      await this.findOne(id);
      return await this.prisma.store.delete({
        where: { id },
        select: this.storeSelect,
      });
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
      const originalExt = (file.originalname.split('.').pop() || '').toLowerCase();
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
        this.logger.warn(`Could not delete banner from storage: ${err.message}`);
      }

      // Remove from array (array will automatically reorder)
      const updatedBanners = currentBanners.filter((_, index) => index !== bannerIndex);

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

  async removeMultipleBanners(
    storeId: string,
    indices: number[],
  ) {
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
      const bannerUrlsToDelete = validIndices.map((index) => currentBanners[index]);

      // Delete from storage (ignore failures)
      const deletePromises = bannerUrlsToDelete.map((url) =>
        this.storageService
          .deleteFile(url)
          .then(() => ({ success: true, url }))
          .catch((err) => {
            this.logger.warn(`Could not delete banner from storage: ${err.message}`);
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
        message: invalidIndices.length > 0
          ? `Removed ${validIndices.length} banners. ${invalidIndices.length} invalid indices ignored.`
          : 'Banners removed successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to remove multiple banners');
    }
  }

  async addMultipleBanners(
    storeId: string,
    files: FileUpload[],
  ) {
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
        const originalExt = (file.originalname.split('.').pop() || '').toLowerCase();
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
          .catch((err) => ({ ok: false, error: String(err?.message || err), name: file.originalname }));
      });

      const results = await Promise.all(uploadPromises);

      const successUrls = results.filter((r) => r.ok).map((r: any) => r.url as string);
      const failures = results.filter((r) => !r.ok).map((r: any) => ({ name: r.name, error: r.error }));

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
        select: { id: true, offerBannerImage: true },
      });
      if (!store) throw new BadRequestException('Store not found');

      // Delete previous offer banner image if exists
      if (store.offerBannerImage) {
        try {
          await this.storageService.deleteFile(store.offerBannerImage);
          this.logger.log(`Previous offer banner deleted: ${store.offerBannerImage}`);
        } catch (err) {
          this.logger.warn(`Could not delete previous offer banner: ${err.message}`);
        }
      }

      // Decide deterministic filename and path
      const allowedExts = ['png', 'jpg', 'jpeg', 'webp'];
      const originalExt = (file.originalname.split('.').pop() || '').toLowerCase();
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
        data: { offerBannerImage: fileUrl },
        select: this.storeSelect,
      });

      return {
        success: true,
        store: updated,
        offerBannerImage: fileUrl,
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

      // Validate store exists and get current offerBannerImage
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, offerBannerImage: true },
      });
      if (!store) {
        this.logger.error(`Store not found: ${storeId}`);
        throw new BadRequestException('Store not found');
      }

      // Delete image from storage if exists
      if (store.offerBannerImage) {
        try {
          await this.storageService.deleteFile(store.offerBannerImage);
          this.logger.log(`Offer banner deleted from storage: ${store.offerBannerImage}`);
        } catch (err) {
          this.logger.warn(`Could not delete offer banner from storage: ${err.message}`);
        }
      }

      // Update store to set offerBannerImage as null
      const updated = await this.prisma.store.update({
        where: { id: storeId },
        data: { offerBannerImage: null },
        select: this.storeSelect,
      });

      return {
        success: true,
        store: updated,
        offerBannerImage: null,
        message: 'Offer banner removed successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to remove offer banner');
    }
  }
}
