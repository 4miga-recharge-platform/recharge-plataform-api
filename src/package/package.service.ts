import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { validateRequiredFields } from 'src/utils/validation.util';
import { Package } from './entities/package.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackageService {
  constructor(private readonly prisma: PrismaService) {}

  private packageSelect = {
    id: true,
    name: true,
    amountCredits: true,
    imgCardUrl: true,
    isOffer: true,
    basePrice: true,
    productId: true,
    storeId: true,
    paymentMethods: true,
    createdAt: false,
    updatedAt: false,
  };

  // master admin only access
  async findAll(): Promise<any[]> {
    try {
      return await this.prisma.package.findMany({ select: this.packageSelect });
    } catch (error) {
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
    } catch (error) {
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
        'storeId'
      ]);

      // Separar paymentMethods do resto dos dados
      const { paymentMethods, ...packageData } = dto;

      // Criar package com payment methods se fornecidos
      const createData: any = {
        ...packageData,
        ...(paymentMethods && paymentMethods.length > 0 && {
          paymentMethods: {
            create: paymentMethods.map(pm => ({
              name: pm.name,
              price: pm.price,
            }))
          }
        })
      };

      return await this.prisma.package.create({
        data: createData,
        select: this.packageSelect
      });
    } catch (error) {
      throw new BadRequestException('Failed to create package');
    }
  }

  async update(id: string, dto: UpdatePackageDto): Promise<any> {
    try {
      await this.findOne(id);

      // Validar campos vazios de forma mais robusta
      Object.entries(dto).forEach(([key, value]) => {
        // Para strings
        if (typeof value === 'string' && value.trim() === '') {
          throw new BadRequestException(`Field '${key}' cannot be empty`);
        }
        // Para números (verificar se não é null/undefined)
        if (typeof value === 'number' && (value === null || value === undefined)) {
          throw new BadRequestException(`Field '${key}' cannot be empty`);
        }
        // Para boolean (verificar se não é null/undefined)
        if (typeof value === 'boolean' && (value === null || value === undefined)) {
          throw new BadRequestException(`Field '${key}' cannot be empty`);
        }
      });

      // Validar foreign keys se estiverem sendo atualizadas
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

      // Separar paymentMethods do resto dos dados
      const { paymentMethods, ...packageData } = dto;

      // Preparar dados para atualização
      const updateData: any = {
        ...packageData,
        ...(paymentMethods && paymentMethods.length > 0 && {
          paymentMethods: {
            deleteMany: {}, // Remove todos os payment methods existentes
            create: paymentMethods.map(pm => ({
              name: pm.name,
              price: pm.price,
            }))
          }
        })
      };

      return await this.prisma.package.update({
        where: { id },
        data: updateData,
        select: this.packageSelect,
      });
    } catch (error) {
      throw new BadRequestException('Failed to update package');
    }
  }

  async remove(id: string): Promise<any> {
    try {
      await this.findOne(id);
      return await this.prisma.package.delete({
        where: { id },
        select: this.packageSelect,
      });
    } catch (error) {
      throw new BadRequestException('Failed to remove package');
    }
  }
}
