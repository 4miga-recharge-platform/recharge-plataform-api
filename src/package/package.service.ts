import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WebhookService } from '../webhook/webhook.service';
import { validateRequiredFields } from 'src/utils/validation.util';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackageService {
  constructor(
    private readonly prisma: PrismaService,
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
      await this.webhookService.notifyPackageUpdate(package_.id, package_.storeId, 'created');

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
      await this.webhookService.notifyPackageUpdate(package_.id, package_.storeId, 'updated');

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
      await this.webhookService.notifyPackageUpdate(id, deletedPackage.storeId, 'deleted');

      return deletedPackage;
    } catch {
      throw new BadRequestException('Failed to remove package');
    }
  }
}
