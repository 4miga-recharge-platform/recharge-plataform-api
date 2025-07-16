import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { StoreType } from 'src/types/store.type';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

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

  // acesso somente ao master admin
  async findAll(): Promise<any> {
    const data = await this.prisma.store.findMany({ select: this.storeSelect });

    return data
  }

  async findOne(id: string) {
    const data = await this.prisma.store.findUnique({
      where: { id },
      select: this.storeSelect,
    });

    if (!data) {
      throw new BadRequestException('Store not found');
    }
    return data;
  }

  async create(dto: CreateStoreDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const data = { ...dto, password: await bcrypt.hash(dto.password, 10) };
    return await this.prisma.store.create({ data, select: this.storeSelect });
  }

  async update(id: string, dto: UpdateStoreDto) {
    await this.findOne(id);
    const data = { ...dto };
    return await this.prisma.store.update({
      where: { id },
      data,
      select: this.storeSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.prisma.store.delete({
      where: { id },
      select: this.storeSelect,
    });
  }
}
