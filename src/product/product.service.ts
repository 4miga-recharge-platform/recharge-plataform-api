import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WebhookService } from '../webhook/webhook.service';

import { ProductType } from 'src/utils/types/product.type';
import { validateRequiredFields } from 'src/utils/validation.util';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateStoreProductSettingsDto } from './dto/create-store-product-settings.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStoreProductSettingsDto } from './dto/update-store-product-settings.dto';
import { Product } from './entities/product.entity';
import { StoreProductSettings } from './entities/store-product-settings.entity';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
  ) {}

  private productSelect = {
    id: true,
    name: true,
    description: true,
    instructions: true,
    imgBannerUrl: true,
    imgCardUrl: true,
    packages: false,
    createdAt: false,
    updatedAt: false,
  };

  // master admin only access
  async findAll(storeId: string): Promise<any[]> {
    try {
      const products = await this.prisma.product.findMany({
        select: this.productSelect,
      });
      // For each product, fetch related packages and customizations by storeId
      const productsWithPackagesAndCustomizations = await Promise.all(
        products.map(async (product) => {
          // Fetch packages for this store
          const packages = await this.prisma.package.findMany({
            where: {
              productId: product.id,
              storeId: storeId,
            },
            select: {
              id: true,
              name: true,
              amountCredits: true,
              imgCardUrl: true,
              isOffer: true,
              basePrice: true,
              productId: true,
              storeId: true,
              createdAt: false,
              updatedAt: false,
              paymentMethods: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  packageId: true,
                  createdAt: false,
                  updatedAt: false,
                },
              },
            },
          });

          // Fetch store customizations for this product
          const customization =
            await this.prisma.storeProductSettings.findFirst({
              where: {
                productId: product.id,
                storeId: storeId,
              },
            });

          // Merge product data with customization (fallback logic)
          const customizedProduct = {
            ...product,
            packages,
            storeCustomization: customization
              ? {
                  description: customization.description || product.description,
                  instructions:
                    customization.instructions || product.instructions,
                  imgBannerUrl:
                    customization.imgBannerUrl || product.imgBannerUrl,
                  imgCardUrl: customization.imgCardUrl || product.imgCardUrl,
                }
              : null,
          };

          return customizedProduct;
        }),
      );
      return productsWithPackagesAndCustomizations;
    } catch {
      throw new BadRequestException('Failed to fetch products');
    }
  }

  async findAllForAdmin(): Promise<Product[]> {
    try {
      return await this.prisma.product.findMany({ select: this.productSelect });
    } catch {
      throw new BadRequestException('Failed to fetch products');
    }
  }

  async findOne(id: string, storeId: string): Promise<any> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        select: this.productSelect,
      });
      if (!product) {
        throw new BadRequestException('Product not found');
      }
      // Fetch packages related to storeId and include paymentMethods
      const packages = await this.prisma.package.findMany({
        where: {
          productId: product.id,
          storeId: storeId,
        },
        include: {
          paymentMethods: {
            select: {
              id: true,
              name: true,
              price: true,
              createdAt: false,
              updatedAt: false,
            },
          },
        },
      });

      // Fetch store customizations for this product
      const customization = await this.prisma.storeProductSettings.findFirst({
        where: {
          productId: product.id,
          storeId: storeId,
        },
      });

      // Merge product data with customization (fallback logic)
      const customizedProduct = {
        ...product,
        packages,
        storeCustomization: customization
          ? {
              description: customization.description || product.description,
              instructions: customization.instructions || product.instructions,
              imgBannerUrl: customization.imgBannerUrl || product.imgBannerUrl,
              imgCardUrl: customization.imgCardUrl || product.imgCardUrl,
            }
          : null,
      };

      return customizedProduct;
    } catch {
      throw new BadRequestException('Failed to fetch product');
    }
  }

  async create(dto: CreateProductDto): Promise<Product> {
    try {
      validateRequiredFields(dto, [
        'name',
        'description',
        'instructions',
        'imgBannerUrl',
        'imgCardUrl',
      ]);
      const product = await this.prisma.product.create({
        data: dto,
      });

      // Notify frontend via webhook
      await this.webhookService.notifyProductUpdate(product.id, 'created');

      return product;
    } catch {
      throw new BadRequestException('Failed to create product');
    }
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    try {
      const fieldsToValidate = Object.keys(dto).filter(
        (key) => dto[key] !== undefined,
      );
      validateRequiredFields(dto, fieldsToValidate);
      const product = await this.prisma.product.update({
        where: { id },
        data: dto,
      });

      // Notify frontend via webhook
      await this.webhookService.notifyProductUpdate(product.id, 'updated');

      return product;
    } catch {
      throw new BadRequestException('Failed to update product');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        select: this.productSelect,
      });
      if (!product) {
        throw new BadRequestException('Product not found');
      }
      await this.prisma.product.delete({
        where: { id },
      });

      // Notify frontend via webhook
      await this.webhookService.notifyProductUpdate(id, 'deleted');

      return { message: 'Product deleted successfully' };
    } catch {
      throw new BadRequestException('Failed to remove product');
    }
  }

  // StoreProductSettings CRUD methods
  async createStoreProductSettings(
    dto: CreateStoreProductSettingsDto,
  ): Promise<StoreProductSettings> {
    try {
      validateRequiredFields(dto, ['storeId', 'productId']);

      // Check if store exists
      const store = await this.prisma.store.findUnique({
        where: { id: dto.storeId },
      });
      if (!store) {
        throw new BadRequestException('Store not found');
      }

      // Check if product exists
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
      });
      if (!product) {
        throw new BadRequestException('Product not found');
      }

      // Check if customization already exists
      const existingCustomization =
        await this.prisma.storeProductSettings.findFirst({
          where: {
            storeId: dto.storeId,
            productId: dto.productId,
          },
        });
      if (existingCustomization) {
        throw new BadRequestException(
          'Product customization already exists for this store',
        );
      }

      const customization = await this.prisma.storeProductSettings.create({
        data: dto,
      });

      // Notify frontend via webhook
      await this.webhookService.notifyProductUpdate(
        dto.productId,
        'updated',
      );

      return customization;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create product customization');
    }
  }

  async findAllStoreProductSettings(
    storeId: string,
  ): Promise<StoreProductSettings[]> {
    try {
      if (!storeId) {
        throw new BadRequestException('Store ID is required');
      }

      return await this.prisma.storeProductSettings.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch product customizations');
    }
  }

  async findOneStoreProductSettings(id: string, storeId: string): Promise<StoreProductSettings> {
    try {
      if (!id) {
        throw new BadRequestException('Customization ID is required');
      }
      if (!storeId) {
        throw new BadRequestException('Store ID is required');
      }

      const customization = await this.prisma.storeProductSettings.findFirst({
        where: {
          id,
          storeId
        },
      });
      if (!customization) {
        throw new BadRequestException('Product customization not found');
      }
      return customization;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch product customization');
    }
  }

  async updateStoreProductSettings(
    id: string,
    dto: UpdateStoreProductSettingsDto,
  ): Promise<StoreProductSettings> {
    try {
      const fieldsToValidate = Object.keys(dto).filter(
        (key) => dto[key] !== undefined,
      );
      validateRequiredFields(dto, fieldsToValidate);

      const existingCustomization =
        await this.prisma.storeProductSettings.findUnique({
          where: { id },
        });
      if (!existingCustomization) {
        throw new BadRequestException('Product customization not found');
      }

      const customization = await this.prisma.storeProductSettings.update({
        where: { id },
        data: dto,
      });

      // Notify frontend via webhook
      await this.webhookService.notifyProductUpdate(
        customization.productId,
        'updated',
      );

      return customization;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update product customization');
    }
  }

  async removeStoreProductSettings(id: string): Promise<{ message: string }> {
    try {
      const customization = await this.prisma.storeProductSettings.findUnique({
        where: { id },
      });
      if (!customization) {
        throw new BadRequestException('Product customization not found');
      }

      await this.prisma.storeProductSettings.delete({
        where: { id },
      });

      // Notify frontend via webhook
      await this.webhookService.notifyProductUpdate(
        customization.productId,
        'updated',
      );

      return { message: 'Product customization deleted successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to remove product customization');
    }
  }
}
