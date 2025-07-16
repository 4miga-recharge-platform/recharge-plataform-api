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
      console.log(dto.amountCredits);
      return await this.prisma.package.create({ data: dto, select: this.packageSelect });
    } catch (error) {
      throw new BadRequestException('Failed to create package', error.message);
    }
  }

  async update(id: string, dto: UpdatePackageDto): Promise<any> {
    try {
      await this.findOne(id);
      Object.entries(dto).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim() === '') {
          throw new BadRequestException(`Field '${key}' cannot be empty`);
        }
      });
      return await this.prisma.package.update({
        where: { id },
        data: dto,
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
