import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { validateRequiredFields } from 'src/utils/validation.util';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Store } from './entities/store.entity';

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  private storeSelect = {
    id: true,
    name: true,
    email: true,
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
}
