import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';

import { validateRequiredFields } from 'src/utils/validation.util';
import { Product } from './entities/product.entity';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  private productSelect = {
    id: true,
    name: true,
    description: true,
    instructions: true,
    imgBannerUrl: true,
    imgCardUrl: true,
    packages: false, // Não buscar packages diretamente
    createdAt: false,
    updatedAt: false,
  };

  // master admin only access
  async findAll(storeId: string): Promise<any[]> {
    try {
      const products = await this.prisma.product.findMany({ select: this.productSelect });
      // Para cada produto, buscar os packages relacionados ao storeId e incluir paymentMethods
      const productsWithPackages = await Promise.all(
        products.map(async (product) => {
          const packages = await this.prisma.package.findMany({
            where: {
              productId: product.id,
              storeId: storeId,
            },
            include: {
              paymentMethods: true,
            },
          });
          return { ...product, packages };
        })
      );
      return productsWithPackages;
    } catch (error) {
      throw new BadRequestException('Failed to fetch products');
    }
  }

  // admin only access - retorna produtos sem packages
  async findAllForAdmin(): Promise<Product[]> {
    try {
      return await this.prisma.product.findMany({ select: this.productSelect });
    } catch (error) {
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
      // Buscar os packages relacionados ao storeId e incluir paymentMethods
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
    } catch (error) {
      throw new BadRequestException('Failed to fetch product');
    }
  }

  async create(dto: CreateProductDto): Promise<Product> {
    try {
      validateRequiredFields(dto, ['name', 'description', 'instructions', 'imgBannerUrl', 'imgCardUrl']);
      return await this.prisma.product.create({ data: dto, select: this.productSelect });
    } catch (error) {
      throw new BadRequestException('Failed to create product');
    }
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    try {
      await this.findOne(id, ''); // Verificar se o produto existe
      Object.entries(dto).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim() === '') {
          throw new BadRequestException(`Field '${key}' cannot be empty`);
        }
      });
      return await this.prisma.product.update({
        where: { id },
        data: dto,
        select: this.productSelect,
      });
    } catch (error) {
      throw new BadRequestException('Failed to update product');
    }
  }

  async remove(id: string): Promise<Product> {
    try {
      // Verificar se o produto existe antes de remover
      const product = await this.prisma.product.findUnique({
        where: { id },
        select: this.productSelect,
      });
      if (!product) {
        throw new BadRequestException('Product not found');
      }
      return await this.prisma.product.delete({
        where: { id },
        select: this.productSelect,
      });
    } catch (error) {
      throw new BadRequestException('Failed to remove product');
    }
  }
}
