import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WebhookService } from '../webhook/webhook.service';

import { validateRequiredFields } from 'src/utils/validation.util';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

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
      // For each product, fetch related packages by storeId and include paymentMethods
      const productsWithPackages = await Promise.all(
        products.map(async (product) => {
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
          return { ...product, packages };
        }),
      );
      return productsWithPackages;
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
      return { ...product, packages };
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
}
