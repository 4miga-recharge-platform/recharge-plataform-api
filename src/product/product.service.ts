import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WebhookService } from '../webhook/webhook.service';
import { StorageService } from '../storage/storage.service';

interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

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
    private readonly storageService: StorageService,
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
              isActive: true,
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
            orderBy: { amountCredits: 'asc' },
          });

          // Convert Decimal to number for consistency
          const convertedPackages = packages.map((pkg) => ({
            ...pkg,
            basePrice: pkg.basePrice.toNumber(),
            paymentMethods: pkg.paymentMethods?.map((pm) => ({
              ...pm,
              price: pm.price.toNumber(),
            })),
          }));

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
            packages: convertedPackages,
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

      // Sort products: "Bigo Live" always first, then others by name
      const sortedProducts = productsWithPackagesAndCustomizations.sort(
        (a, b) => {
          const aIsBigo = a.name.toLowerCase().includes('bigo');
          const bIsBigo = b.name.toLowerCase().includes('bigo');

          if (aIsBigo && !bIsBigo) return -1;
          if (!aIsBigo && bIsBigo) return 1;
          return a.name.localeCompare(b.name);
        },
      );

      return sortedProducts;
    } catch {
      throw new BadRequestException('Failed to fetch products');
    }
  }

  async findAllForAdmin(): Promise<Product[]> {
    try {
      const products = await this.prisma.product.findMany({
        select: this.productSelect,
      });

      // Sort products: "Bigo Live" always first, then others by name
      const sortedProducts = products.sort((a, b) => {
        const aIsBigo = a.name.toLowerCase().includes('bigo');
        const bIsBigo = b.name.toLowerCase().includes('bigo');

        if (aIsBigo && !bIsBigo) return -1;
        if (!aIsBigo && bIsBigo) return 1;
        return a.name.localeCompare(b.name);
      });

      return sortedProducts;
    } catch {
      throw new BadRequestException('Failed to fetch products');
    }
  }

  private readonly logger = new Logger(ProductService.name);

  async updateStoreProductImage(
    storeId: string,
    productId: string,
    file: FileUpload,
    imageType: 'banner' | 'card',
  ) {
    try {
      if (!file) {
        throw new BadRequestException('File is required');
      }

      // Validate store and product
      const [store, product] = await Promise.all([
        this.prisma.store.findUnique({ where: { id: storeId } }),
        this.prisma.product.findUnique({ where: { id: productId } }),
      ]);
      if (!store) throw new BadRequestException('Store not found');
      if (!product) throw new BadRequestException('Product not found');

      // Ensure settings exist
      let settings = await this.prisma.storeProductSettings.findFirst({
        where: { storeId, productId },
      });
      if (!settings) {
        settings = await this.prisma.storeProductSettings.create({
          data: { storeId, productId },
        });
      }

      // Delete previous image if exists
      const currentImageUrl =
        imageType === 'banner' ? settings.imgBannerUrl : settings.imgCardUrl;
      if (currentImageUrl) {
        try {
          await this.storageService.deleteFile(currentImageUrl);
          this.logger.log(`Previous ${imageType} image deleted`);
        } catch (err) {
          this.logger.warn(
            `Could not delete previous ${imageType}: ${err.message}`,
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
      const desiredFileName = `${imageType}.${ext}`;
      const folderPath = `store/${storeId}/product/${productId}/${imageType}`;

      const fileUrl = await this.storageService.uploadFile(
        file,
        folderPath,
        desiredFileName,
      );

      // Update the correct field based on image type
      const updateData =
        imageType === 'banner'
          ? { imgBannerUrl: fileUrl }
          : { imgCardUrl: fileUrl };

      const updated = await this.prisma.storeProductSettings.update({
        where: { id: settings.id },
        data: updateData,
      });

      // await this.webhookService.notifyProductUpdate(productId, 'updated');

      return {
        success: true,
        settings: updated,
        fileUrl,
        message: `${imageType.charAt(0).toUpperCase() + imageType.slice(1)} image updated successfully`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to upload ${imageType} image`);
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
        orderBy: { amountCredits: 'asc' },
      });

      // Convert Decimal to number for consistency
      const convertedPackages = packages.map((pkg) => ({
        ...pkg,
        basePrice: pkg.basePrice.toNumber(),
        paymentMethods: pkg.paymentMethods?.map((pm) => ({
          ...pm,
          price: pm.price.toNumber(),
        })),
      }));

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
        packages: convertedPackages,
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

  async findBigoProduct(storeId: string): Promise<any> {
    try {
      // Find product with name containing "bigo" (case-insensitive)
      const product = await this.prisma.product.findFirst({
        where: {
          name: {
            contains: 'bigo',
            mode: 'insensitive',
          },
        },
        select: this.productSelect,
      });

      if (!product) {
        throw new BadRequestException('Bigo product not found');
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
        orderBy: { amountCredits: 'asc' },
      });

      // Convert Decimal to number for consistency
      const convertedPackages = packages.map((pkg) => ({
        ...pkg,
        basePrice: pkg.basePrice.toNumber(),
        paymentMethods: pkg.paymentMethods?.map((pm) => ({
          ...pm,
          price: pm.price.toNumber(),
        })),
      }));

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
        packages: convertedPackages,
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
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch Bigo product');
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

      return product;
    } catch {
      throw new BadRequestException('Failed to create product');
    }
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    try {
      // Verify product exists
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
      });
      if (!existingProduct) {
        throw new BadRequestException('Product not found');
      }

      const fieldsToValidate = Object.keys(dto).filter(
        (key) => dto[key] !== undefined,
      );
      validateRequiredFields(dto, fieldsToValidate);

      const product = await this.prisma.product.update({
        where: { id },
        data: dto,
      });

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

  async findOneStoreProductSettings(
    id: string,
    storeId: string,
  ): Promise<StoreProductSettings> {
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
          storeId,
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
    storeId: string,
    productId: string,
    dto: UpdateStoreProductSettingsDto,
  ): Promise<StoreProductSettings> {
    try {
      const fieldsToValidate = Object.keys(dto).filter(
        (key) => dto[key] !== undefined,
      );
      validateRequiredFields(dto, fieldsToValidate);

      // Check if store exists
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
      });
      if (!store) {
        throw new BadRequestException('Store not found');
      }

      // Check if product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new BadRequestException('Product not found');
      }

      // Find existing customization or create if doesn't exist
      let existingCustomization =
        await this.prisma.storeProductSettings.findFirst({
          where: {
            storeId,
            productId,
          },
        });

      if (!existingCustomization) {
        // Create new customization if it doesn't exist
        existingCustomization = await this.prisma.storeProductSettings.create({
          data: {
            storeId,
            productId,
            ...dto,
          },
        });
      } else {
        // Update existing customization
        existingCustomization = await this.prisma.storeProductSettings.update({
          where: { id: existingCustomization.id },
          data: dto,
        });
      }

      return existingCustomization;
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

      return { message: 'Product customization deleted successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to remove product customization');
    }
  }
}
