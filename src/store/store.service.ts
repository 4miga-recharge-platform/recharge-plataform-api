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
    onSaleUrlImg: true,
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

  async addBanner(storeId: string, file: FileUpload, userStoreId: string) {
    try {
      if (!file) {
        throw new BadRequestException('File is required');
      }

      // Validate store and ownership
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, bannersUrl: true },
      });
      if (!store) throw new BadRequestException('Store not found');
      if (store.id !== userStoreId) {
        throw new BadRequestException('Store does not belong to your account');
      }

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

  async removeBanner(storeId: string, bannerIndex: number, userStoreId: string) {
    try {
      // Validate store and ownership
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, bannersUrl: true },
      });
      if (!store) throw new BadRequestException('Store not found');
      if (store.id !== userStoreId) {
        throw new BadRequestException('Store does not belong to your account');
      }

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
}
