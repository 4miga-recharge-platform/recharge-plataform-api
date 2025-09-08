import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInfluencerDto } from './dto/create-influencer.dto';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';

@Injectable()
export class InfluencerService {
  constructor(private readonly prisma: PrismaService) {}

  private influencerSelectBasic = {
    id: true,
    name: true,
    email: true,
    phone: true,
    paymentMethod: true,
    paymentData: true,
    isActive: true,
    storeId: true,
    coupons: false,
    monthlySales: false,
    createdAt: true,
    updatedAt: true,
  };

  private influencerSelectComplete = {
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
        select: this.influencerSelectComplete,
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
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const [data, totalInfluencers] = await Promise.all([
        this.prisma.influencer.findMany({
          where,
          select: this.influencerSelectBasic,
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

  async create(dto: CreateInfluencerDto, storeId: string): Promise<any> {
    try {
      // Validate required fields with specific messages
      if (!dto.name || dto.name.trim() === '') {
        throw new BadRequestException(
          'Influencer name is required and cannot be empty',
        );
      }

      if (!dto.paymentMethod || dto.paymentMethod.trim() === '') {
        throw new BadRequestException(
          'Payment method is required and cannot be empty',
        );
      }

      if (!dto.paymentData || dto.paymentData.trim() === '') {
        throw new BadRequestException(
          'Payment data is required and cannot be empty',
        );
      }

      // Validate name length
      if (dto.name.length < 2) {
        throw new BadRequestException(
          'Influencer name must be at least 2 characters long',
        );
      }

      if (dto.name.length > 100) {
        throw new BadRequestException(
          'Influencer name cannot exceed 100 characters',
        );
      }

      // Check if store exists
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
      });
      if (!store) {
        throw new BadRequestException('Store not found');
      }

      // Check if influencer with this name already exists for this store
      const existingInfluencer = await this.prisma.influencer.findFirst({
        where: {
          name: dto.name,
          storeId: storeId,
        },
      });
      if (existingInfluencer) {
        throw new BadRequestException(
          'Influencer with this name already exists for this store',
        );
      }

      return await this.prisma.influencer.create({
        data: {
          ...dto,
          storeId: storeId,
          isActive: dto.isActive ?? true,
        },
        select: this.influencerSelectBasic,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // Preserva a mensagem específica
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

      // Validate fields if they are provided
      if (dto.name !== undefined) {
        if (dto.name.trim() === '') {
          throw new BadRequestException('Influencer name cannot be empty');
        }

        if (dto.name.length < 2) {
          throw new BadRequestException(
            'Influencer name must be at least 2 characters long',
          );
        }

        if (dto.name.length > 100) {
          throw new BadRequestException(
            'Influencer name cannot exceed 100 characters',
          );
        }

        // Check if new name already exists for the store
        const existingInfluencer = await this.prisma.influencer.findFirst({
          where: {
            name: dto.name,
            storeId: storeId,
            id: { not: id },
          },
        });
        if (existingInfluencer) {
          throw new BadRequestException(
            'Influencer with this name already exists for this store',
          );
        }
      }

      if (dto.paymentMethod !== undefined && dto.paymentMethod.trim() === '') {
        throw new BadRequestException('Payment method cannot be empty');
      }

      if (dto.paymentData !== undefined && dto.paymentData.trim() === '') {
        throw new BadRequestException('Payment data cannot be empty');
      }

      return await this.prisma.influencer.update({
        where: { id },
        data: dto,
        select: this.influencerSelectBasic,
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
        where: { id }
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // Preserva a mensagem específica
      }
      throw new BadRequestException('Failed to remove influencer');
    }
  }
}
