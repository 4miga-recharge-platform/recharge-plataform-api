import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { validateRequiredFields } from 'src/utils/validation.util';
import { StorageService } from '../storage/storage.service';
import { WebhookService } from '../webhook/webhook.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class PackageService {
  private readonly logger = new Logger(PackageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly webhookService: WebhookService,
  ) {}

  private packageSelect = {
    id: true,
    name: true,
    amountCredits: true,
    imgCardUrl: true,
    isActive: true,
    isOffer: true,
    basePrice: true,
    productId: true,
    storeId: true,
    paymentMethods: true,
    createdAt: false,
    updatedAt: false,
  };

  // master admin only access
  async findAll(storeId: string): Promise<any[]> {
    try {
      return await this.prisma.package.findMany({
        where: { storeId },
        select: this.packageSelect,
      });
    } catch {
      throw new BadRequestException('Failed to fetch packages');
    }
  }

  async findOne(id: string): Promise<any> {
    try {
      const data = await this.prisma.package.findUnique({
        where: { id },
        select: this.packageSelect,
      });
      if (!data) {
        throw new BadRequestException('Package not found');
      }
      return data;
    } catch {
      throw new BadRequestException('Failed to fetch package');
    }
  }

  async create(dto: CreatePackageDto): Promise<any> {
    try {
      validateRequiredFields(dto, [
        'name',
        'amountCredits',
        'imgCardUrl',
        'basePrice',
        'productId',
        'storeId',
      ]);

      // Separate paymentMethods from the rest of the data
      const { paymentMethods, ...packageData } = dto;

      // Create package with payment methods if provided
      const createData: any = {
        ...packageData,
        ...(paymentMethods &&
          paymentMethods.length > 0 && {
            paymentMethods: {
              create: paymentMethods.map((pm) => ({
                name: pm.name,
                price: pm.price,
              })),
            },
          }),
      };

      const package_ = await this.prisma.package.create({
        data: createData,
        select: this.packageSelect,
      });

      // Notify frontend via webhook
      await this.webhookService.notifyPackageUpdate(
        package_.id,
        package_.storeId,
        'created',
      );

      return package_;
    } catch {
      throw new BadRequestException('Failed to create package');
    }
  }

  async update(id: string, dto: UpdatePackageDto): Promise<any> {
    try {
      await this.findOne(id);
      const fieldsToValidate = Object.keys(dto).filter(
        (key) => dto[key] !== undefined,
      );
      validateRequiredFields(dto, fieldsToValidate);

      if (dto.productId) {
        const product = await this.prisma.product.findUnique({
          where: { id: dto.productId },
        });
        if (!product) {
          throw new BadRequestException('Product not found');
        }
      }

      if (dto.storeId) {
        const store = await this.prisma.store.findUnique({
          where: { id: dto.storeId },
        });
        if (!store) {
          throw new BadRequestException('Store not found');
        }
      }

      // Separate paymentMethods from the rest of the data
      const { paymentMethods, ...packageData } = dto;

      // Prepare data for update
      const updateData: any = {
        ...packageData,
        ...(paymentMethods &&
          paymentMethods.length > 0 && {
            paymentMethods: {
              deleteMany: {}, // Remove todos os payment methods existentes
              create: paymentMethods.map((pm) => ({
                name: pm.name,
                price: pm.price,
              })),
            },
          }),
      };

      const package_ = await this.prisma.package.update({
        where: { id },
        data: updateData,
        select: this.packageSelect,
      });

      // Notify frontend via webhook
      await this.webhookService.notifyPackageUpdate(
        package_.id,
        package_.storeId,
        'updated',
      );

      return package_;
    } catch {
      throw new BadRequestException('Failed to update package');
    }
  }

  async remove(id: string): Promise<any> {
    try {
      await this.findOne(id);
      const deletedPackage = await this.prisma.package.delete({
        where: { id },
        select: this.packageSelect,
      });

      // Notify frontend via webhook
      await this.webhookService.notifyPackageUpdate(
        id,
        deletedPackage.storeId,
        'deleted',
      );

      return deletedPackage;
    } catch {
      throw new BadRequestException('Failed to remove package');
    }
  }

  async uploadCardImage(packageId: string, file: FileUpload, storeId: string) {
    this.logger.log(
      `Uploading card image for package ${packageId}, storeId: ${storeId}`,
    );

    try {
      const packageExists = await this.prisma.package.findUnique({
        where: { id: packageId },
        select: { id: true, imgCardUrl: true, storeId: true },
      });

      this.logger.log(`Package exists: ${!!packageExists}`);

      if (!packageExists) {
        throw new NotFoundException('Package not found');
      }

      if (packageExists.storeId !== storeId) {
        throw new BadRequestException('Package does not belong to your store');
      }

      const folderPath = `store/${storeId}/packages/${packageId}`;
      this.logger.log(`Uploading to folder: ${folderPath}`);

      // Delete previous image if exists
      if (packageExists.imgCardUrl) {
        try {
          await this.storageService.deleteFile(packageExists.imgCardUrl);
          this.logger.log('Previous card image deleted');
        } catch (err) {
          this.logger.warn(`Could not delete previous image: ${err.message}`);
        }
      }

      // Decide deterministic filename: card.<ext>
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

      const desiredFileName = `card.${ext}`;

      const fileUrl = await this.storageService.uploadFile(
        file,
        folderPath,
        desiredFileName,
      );
      this.logger.log(`File uploaded successfully: ${fileUrl}`);

      const updatedPackage = await this.prisma.package.update({
        where: { id: packageId },
        data: { imgCardUrl: fileUrl },
        select: this.packageSelect,
      });

      this.logger.log(`Package updated successfully`);

      return {
        success: true,
        package: updatedPackage,
        fileUrl,
        message: 'Package card image uploaded successfully',
      };
    } catch (error) {
      this.logger.error(`Error uploading card image: ${error.message}`);
      throw error;
    }
  }
}
