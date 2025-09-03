import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { validateRequiredFields } from 'src/utils/validation.util';
import { CreateInfluencerDto } from './dto/create-influencer.dto';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';

@Injectable()
export class InfluencerService {
  constructor(private readonly prisma: PrismaService) {}

  private influencerSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    paymentMethod: true,
    paymentData: true,
    isActive: true,
    storeId: true,
    coupons: true,
    monthlySales: true,
    createdAt: true,
    updatedAt: true,
  };

  async findOne(id: string, storeId: string): Promise<any> {
    try {
      const data = await this.prisma.influencer.findFirst({
        where: {
          id,
          storeId, // Ensures the influencer belongs to the user's store
        },
        select: this.influencerSelect,
      });
      if (!data) {
        throw new BadRequestException('Influencer not found');
      }

      return data;
    } catch {
      throw new BadRequestException('Failed to fetch influencer');
    }
  }

  async findByStore(
    storeId: string,
    page = 1,
    limit = 10,
    search?: string,
    isActive?: boolean,
  ): Promise<{
    data: any[];
    totalInfluencers: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const where: any = { storeId };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const [data, totalInfluencers] = await Promise.all([
        this.prisma.influencer.findMany({
          where,
          select: this.influencerSelect,
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.influencer.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(totalInfluencers / limit);

      return {
        data,
        totalInfluencers,
        page,
        totalPages,
      };
    } catch {
      throw new BadRequestException('Failed to fetch influencers by store');
    }
  }

  async create(dto: CreateInfluencerDto): Promise<any> {
    try {
      validateRequiredFields(dto, ['name', 'storeId']);

      // Check if store exists
      const store = await this.prisma.store.findUnique({
        where: { id: dto.storeId },
      });
      if (!store) {
        throw new BadRequestException('Store not found');
      }

      // Check if influencer with this name already exists for this store
      const existingInfluencer = await this.prisma.influencer.findFirst({
        where: {
          name: dto.name,
          storeId: dto.storeId,
        },
      });
      if (existingInfluencer) {
        throw new BadRequestException(
          'Influencer with this name already exists for this store',
        );
      }

      return await this.prisma.influencer.create({
        data: dto,
        select: this.influencerSelect,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create influencer');
    }
  }

  async update(
    id: string,
    dto: UpdateInfluencerDto,
    storeId: string,
  ): Promise<any> {
    try {
      await this.findOne(id, storeId);

      const fieldsToValidate = Object.keys(dto).filter(
        (key) => dto[key] !== undefined,
      );
      validateRequiredFields(dto, fieldsToValidate);

      // If updating storeId, check if new store exists
      if (dto.storeId) {
        const store = await this.prisma.store.findUnique({
          where: { id: dto.storeId },
        });
        if (!store) {
          throw new BadRequestException('Store not found');
        }
      }

      // If updating name, check if new name already exists for the store
      if (dto.name) {
        const existingInfluencer = await this.prisma.influencer.findFirst({
          where: {
            name: dto.name,
            storeId: dto.storeId || storeId,
            id: { not: id },
          },
        });
        if (existingInfluencer) {
          throw new BadRequestException(
            'Influencer with this name already exists for this store',
          );
        }
      }

      return await this.prisma.influencer.update({
        where: { id },
        data: dto,
        select: this.influencerSelect,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update influencer');
    }
  }

  async remove(id: string, storeId: string): Promise<any> {
    try {
      await this.findOne(id, storeId);

      // Check if influencer has associated coupons
      const coupons = await this.prisma.coupon.findMany({
        where: { influencerId: id },
      });
      if (coupons.length > 0) {
        throw new BadRequestException(
          'Cannot delete influencer with associated coupons',
        );
      }

      return await this.prisma.influencer.delete({
        where: { id },
        select: this.influencerSelect,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to remove influencer');
    }
  }
}
