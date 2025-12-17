import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { validateRequiredFields } from 'src/utils/validation.util';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  private couponSelect = {
    id: true,
    title: true,
    influencerId: true,
    discountPercentage: true,
    discountAmount: true,
    expiresAt: true,
    timesUsed: true,
    totalSalesAmount: true,
    maxUses: true,
    minOrderAmount: true,
    isActive: true,
    isFirstPurchase: true,
    storeId: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    // store: false,
    // influencer: false,
    // couponUsages: false,
  };

  async findAll(): Promise<any[]> {
    try {
      const data = await this.prisma.coupon.findMany({
        where: { deletedAt: null },
        select: this.couponSelect,
      });
      return data;
    } catch {
      throw new BadRequestException('Failed to fetch coupons');
    }
  }

  async findOne(id: string): Promise<any> {
    try {
      const data = await this.prisma.coupon.findUnique({
        where: { id },
        select: {
          ...this.couponSelect,
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      if (!data || data.deletedAt) {
        throw new BadRequestException('Coupon not found');
      }
      return data;
    } catch {
      throw new BadRequestException('Failed to fetch coupon');
    }
  }

  async findByStore(
    storeId: string,
    page = 1,
    limit = 10,
    search?: string,
    type?: string,
    isActive?: boolean,
  ): Promise<{
    data: any[];
    totalCoupons: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const where: any = {
        storeId,
        deletedAt: null,
      };

      // Add search filter (title OR influencer name)
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { influencer: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      // Add type filter
      if (type && type !== 'all') {
        if (type === 'percentage') {
          where.discountPercentage = { not: null };
          where.discountAmount = null;
        } else if (type === 'fixed') {
          where.discountAmount = { not: null };
          where.discountPercentage = null;
        } else if (type === 'first-purchase') {
          where.isFirstPurchase = true;
        }
      }

      // Add status filter
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const [data, totalCoupons] = await Promise.all([
        this.prisma.coupon.findMany({
          where,
          select: {
            ...this.couponSelect,
            influencer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.coupon.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(totalCoupons / limit);

      return {
        data,
        totalCoupons,
        page,
        totalPages,
      };
    } catch {
      throw new BadRequestException('Failed to fetch coupons by store');
    }
  }

  async findByInfluencer(influencerId: string): Promise<any[]> {
    try {
      const data = await this.prisma.coupon.findMany({
        where: {
          influencerId,
          deletedAt: null,
        },
        select: this.couponSelect,
      });
      return data;
    } catch {
      throw new BadRequestException('Failed to fetch coupons by influencer');
    }
  }

  async findByInfluencerWithPagination(
    influencerId: string,
    storeId: string,
    page = 1,
    limit = 10,
    search?: string,
    status?: string,
  ): Promise<{
    data: any[];
    totalCoupons: number;
    page: number;
    totalPages: number;
    influencerName: string;
  }> {
    try {
      // Verify influencer exists and belongs to the store
      const influencer = await this.prisma.influencer.findFirst({
        where: {
          id: influencerId,
          storeId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!influencer) {
        throw new BadRequestException(
          'Influencer not found or does not belong to this store',
        );
      }

      const where: any = {
        influencerId,
        storeId,
        deletedAt: null,
      };

      // Add search filter (title)
      if (search) {
        where.title = { contains: search, mode: 'insensitive' };
      }

      // Add status filter
      if (status && status !== 'all') {
        if (status === 'active') {
          where.isActive = true;
        } else if (status === 'inactive') {
          where.isActive = false;
        }
      }

      const [data, totalCoupons] = await Promise.all([
        this.prisma.coupon.findMany({
          where,
          select: this.couponSelect,
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.coupon.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(totalCoupons / limit);

      return {
        data,
        totalCoupons,
        page,
        totalPages,
        influencerName: influencer.name,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch coupons by influencer');
    }
  }

  async findActiveByStore(storeId: string): Promise<any[]> {
    try {
      const data = await this.prisma.coupon.findMany({
        where: {
          storeId,
          isActive: true,
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: this.couponSelect,
      });
      return data;
    } catch {
      throw new BadRequestException('Failed to fetch active coupons by store');
    }
  }

  async findFirstPurchaseByStore(storeId: string): Promise<any[]> {
    try {
      const data = await this.prisma.coupon.findMany({
        where: {
          storeId,
          isFirstPurchase: true,
          isActive: true,
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: this.couponSelect,
      });
      return data;
    } catch {
      throw new BadRequestException(
        'Failed to fetch first purchase coupons by store',
      );
    }
  }

  async create(dto: CreateCouponDto, storeId: string): Promise<any> {
    try {
      // Validate required fields with specific messages
      if (!dto.title || dto.title.trim() === '') {
        throw new BadRequestException(
          'Coupon title is required and cannot be empty',
        );
      }

      if (!dto.influencerId || dto.influencerId.trim() === '') {
        throw new BadRequestException(
          'Influencer ID is required and cannot be empty',
        );
      }

      // Validate title length
      if (dto.title.length < 2) {
        throw new BadRequestException(
          'Coupon title must be at least 2 characters long',
        );
      }

      if (dto.title.length > 20) {
        throw new BadRequestException(
          'Coupon title cannot exceed 20 characters',
        );
      }

      // Check if store exists
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
      });
      if (!store) {
        throw new BadRequestException('Store not found');
      }

      // Check if influencer exists and belongs to the store
      const influencer = await this.prisma.influencer.findFirst({
        where: {
          id: dto.influencerId,
          storeId: storeId,
        },
      });
      if (!influencer) {
        throw new BadRequestException(
          'Influencer not found or does not belong to this store',
        );
      }

      const existingCoupon = await this.prisma.coupon.findFirst({
        where: {
          title: dto.title,
          storeId: storeId,
          deletedAt: null,
        },
      });
      if (existingCoupon) {
        throw new BadRequestException(
          'Coupon with this title already exists for this store',
        );
      }

      // Validate discount logic
      if (dto.discountPercentage && dto.discountAmount) {
        throw new BadRequestException(
          'Cannot have both discount percentage and amount',
        );
      }

      if (!dto.discountPercentage && !dto.discountAmount) {
        throw new BadRequestException(
          'Must have either discount percentage or amount',
        );
      }

      // Validate that fixed discount amount is not greater than minimum order amount
      if (
        dto.discountAmount &&
        dto.minOrderAmount &&
        dto.discountAmount > dto.minOrderAmount
      ) {
        throw new BadRequestException(
          'Fixed discount amount cannot be greater than minimum order amount',
        );
      }

      // Filter out empty strings and null values for optional fields
      const couponData: any = {
        title: dto.title,
        influencerId: dto.influencerId,
        storeId: storeId,
        isActive: dto.isActive ?? true,
        isFirstPurchase: dto.isFirstPurchase ?? false,
      };

      // Only add fields that have valid values
      if (
        dto.discountPercentage !== undefined &&
        dto.discountPercentage !== null
      ) {
        couponData.discountPercentage = dto.discountPercentage;
      }

      if (dto.discountAmount !== undefined && dto.discountAmount !== null) {
        couponData.discountAmount = dto.discountAmount;
      }

      if (dto.expiresAt && dto.expiresAt.trim() !== '') {
        couponData.expiresAt = new Date(dto.expiresAt);
      }

      if (dto.maxUses !== undefined && dto.maxUses !== null) {
        couponData.maxUses = dto.maxUses;
      }

      if (dto.minOrderAmount !== undefined && dto.minOrderAmount !== null) {
        couponData.minOrderAmount = dto.minOrderAmount;
      }

      return await this.prisma.coupon.create({
        data: couponData,
        select: this.couponSelect,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // Preserva a mensagem específica
      }
      throw new BadRequestException('Failed to create coupon');
    }
  }

  async update(id: string, dto: UpdateCouponDto): Promise<any> {
    try {
      await this.findOne(id);

      // Handle discount logic - allow switching between percentage and amount
      if (
        dto.discountPercentage !== undefined ||
        dto.discountAmount !== undefined
      ) {
        // If both are provided and both are not null, throw error
        if (
          dto.discountPercentage !== undefined &&
          dto.discountAmount !== undefined &&
          dto.discountPercentage !== null &&
          dto.discountAmount !== null
        ) {
          throw new BadRequestException(
            'Cannot have both discount percentage and amount',
          );
        }

        // If switching to percentage, clear amount
        if (
          dto.discountPercentage !== undefined &&
          dto.discountPercentage !== null
        ) {
          dto.discountAmount = null;
        }

        // If switching to amount, clear percentage
        if (dto.discountAmount !== undefined && dto.discountAmount !== null) {
          dto.discountPercentage = null;
        }
      }

      // Validate that fixed discount amount is not greater than minimum order amount
      if (
        dto.discountAmount &&
        dto.minOrderAmount &&
        dto.discountAmount > dto.minOrderAmount
      ) {
        throw new BadRequestException(
          'Fixed discount amount cannot be greater than minimum order amount',
        );
      }

      // Validate only fields that have actual values (not undefined or null)
      const fieldsToValidate = Object.keys(dto).filter(
        (key) => dto[key] !== undefined && dto[key] !== null,
      );
      validateRequiredFields(dto, fieldsToValidate);

      // If updating influencerId, check if new influencer exists and belongs to the store
      if (dto.influencerId) {
        const currentCoupon = await this.findOne(id);
        const influencer = await this.prisma.influencer.findFirst({
          where: {
            id: dto.influencerId,
            storeId: currentCoupon.storeId,
          },
        });
        if (!influencer) {
          throw new BadRequestException(
            'Influencer not found or does not belong to this store',
          );
        }
      }

      if (dto.title) {
        const currentCoupon = await this.findOne(id);
        const existingCoupon = await this.prisma.coupon.findFirst({
          where: {
            title: dto.title,
            storeId: currentCoupon.storeId,
            id: { not: id },
            deletedAt: null,
          },
        });
        if (existingCoupon) {
          throw new BadRequestException(
            'Coupon with this title already exists for this store',
          );
        }
      }

      // Convert expiresAt string to Date if provided
      const updateData = {
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      };

      return await this.prisma.coupon.update({
        where: { id },
        data: updateData,
        select: this.couponSelect,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update coupon');
    }
  }

  async remove(id: string): Promise<any> {
    try {
      await this.findOne(id);

      return await this.prisma.coupon.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: this.couponSelect,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to remove coupon');
    }
  }
}
