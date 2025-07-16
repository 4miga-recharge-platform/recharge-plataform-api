import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Store } from './entities/store.entity';
import { validateRequiredFields } from 'src/utils/validation.util';

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  private storeSelect = {
    id: true,
    name: true,
    email: true,
    password: false,
    createdAt: false,
    updatedAt: false,
    users: false,
    packages: false,
    orders: false,
  };

  // master admin only access
  async findAll(): Promise<Store[]> {
    try {
      const data = await this.prisma.store.findMany({ select: this.storeSelect });
      return data;
    } catch (error) {
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
    } catch (error) {
      throw new BadRequestException('Failed to fetch store');
    }
  }

  async create(dto: CreateStoreDto): Promise<Store> {
    try {
      if (dto.password !== dto.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }
      const { confirmPassword, ...rest } = dto;
      validateRequiredFields(rest, ['name', 'email', 'password']);
      const data = { ...rest, password: await bcrypt.hash(dto.password, 10) };
      return await this.prisma.store.create({ data, select: this.storeSelect });
    } catch (error) {
      throw new BadRequestException('Failed to create store');
    }
  }

  async update(id: string, dto: UpdateStoreDto): Promise<Store> {
    try {
      await this.findOne(id);
      const { confirmPassword, ...rest } = dto;
      Object.entries(rest).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim() === '') {
          throw new BadRequestException(`Field '${key}' cannot be empty`);
        }
      });
      const data = { ...rest };
      return await this.prisma.store.update({
        where: { id },
        data,
        select: this.storeSelect,
      });
    } catch (error) {
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
    } catch (error) {
      throw new BadRequestException('Failed to remove store');
    }
  }
}
