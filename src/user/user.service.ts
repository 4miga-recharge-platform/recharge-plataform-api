import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { validateRequiredFields } from 'src/utils/validation.util';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private userSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    phone: true,
    documentType: true,
    documentValue: true,
    password: false,
    createdAt: false,
    updatedAt: false,
    storeId: true,
  };

  async findAll(): Promise<User[]> {
    try {
      const data = await this.prisma.user.findMany({ select: this.userSelect });
      return data;
    } catch (error) {
      throw new BadRequestException('Failed to fetch users');
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      const data = await this.prisma.user.findUnique({
        where: { id },
        select: this.userSelect,
      });
      if (!data) {
        throw new BadRequestException('User not found');
      }
      return data;
    } catch (error) {
      throw new BadRequestException('Failed to fetch user');
    }
  }

  async create(dto: CreateUserDto): Promise<User> {
    try {
      if (dto.password !== dto.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }
      const { confirmPassword, ...rest } = dto;
      validateRequiredFields(rest, [
        'name',
        'email',
        'phone',
        'password',
        'documentType',
        'documentValue',
        'storeId',
      ]);
      const data = { ...rest, password: await bcrypt.hash(dto.password, 10) };
      return await this.prisma.user.create({ data, select: this.userSelect });
    } catch (error) {
      throw new BadRequestException('Failed to create user');
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    try {
      await this.findOne(id);
      const { confirmPassword, ...rest } = dto;
      Object.entries(rest).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim() === '') {
          throw new BadRequestException(`Field '${key}' cannot be empty`);
        }
      });
      const data = { ...rest };
      return await this.prisma.user.update({
        where: { id },
        data,
        select: this.userSelect,
      });
    } catch (error) {
      throw new BadRequestException('Failed to update user');
    }
  }

  async remove(id: string): Promise<User> {
    try {
      await this.findOne(id);
      return await this.prisma.user.delete({
        where: { id },
        select: this.userSelect,
      });
    } catch (error) {
      throw new BadRequestException('Failed to remove user');
    }
  }
}
