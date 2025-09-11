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
    createdAt: false,
    updatedAt: false,
    // store: false,
    // influencer: false,
    // couponUsages: false,
  };

  async findAll(): Promise<any[]> {
    try {
      const data = await this.prisma.coupon.findMany({
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
        select: this.couponSelect,
      });
      if (!data) {
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
      const where: any = { storeId };

      // Add search filter (title OR influencer name)
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { influencer: { name: { contains: search, mode: 'insensitive' } } }
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
              }
            }
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
        where: { influencerId },
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
        throw new BadRequestException('Influencer not found or does not belong to this store');
      }

      const where: any = {
        influencerId,
        storeId
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
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
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
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        select: this.couponSelect,
      });
      return data;
    } catch {
      throw new BadRequestException('Failed to fetch first purchase coupons by store');
    }
  }

  async create(dto: CreateCouponDto): Promise<any> {
    try {
      validateRequiredFields(dto, ['title', 'influencerId', 'storeId']);

      // Check if store exists
      const store = await this.prisma.store.findUnique({
        where: { id: dto.storeId },
      });
      if (!store) {
        throw new BadRequestException('Store not found');
      }

      // Check if influencer exists and belongs to the store
      const influencer = await this.prisma.influencer.findFirst({
        where: {
          id: dto.influencerId,
          storeId: dto.storeId,
        },
      });
      if (!influencer) {
        throw new BadRequestException('Influencer not found or does not belong to this store');
      }

      // Check if coupon title already exists for this store
      const existingCoupon = await this.prisma.coupon.findFirst({
        where: {
          title: dto.title,
          storeId: dto.storeId,
        },
      });
      if (existingCoupon) {
        throw new BadRequestException('Coupon with this title already exists for this store');
      }

      // Validate discount logic
      if (dto.discountPercentage && dto.discountAmount) {
        throw new BadRequestException('Cannot have both discount percentage and amount');
      }

      if (!dto.discountPercentage && !dto.discountAmount) {
        throw new BadRequestException('Must have either discount percentage or amount');
      }

      // Convert expiresAt string to Date if provided
      const couponData = {
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      };

      return await this.prisma.coupon.create({
        data: couponData,
        select: this.couponSelect,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create coupon');
    }
  }

  async update(id: string, dto: UpdateCouponDto): Promise<any> {
    try {
      await this.findOne(id);

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

      // If updating influencerId, check if new influencer exists and belongs to the store
      if (dto.influencerId) {
        const storeId = dto.storeId || (await this.findOne(id)).storeId;
        const influencer = await this.prisma.influencer.findFirst({
          where: {
            id: dto.influencerId,
            storeId,
          },
        });
        if (!influencer) {
          throw new BadRequestException('Influencer not found or does not belong to this store');
        }
      }

      // If updating title, check if new title already exists for the store
      if (dto.title) {
        const storeId = dto.storeId || (await this.findOne(id)).storeId;
        const existingCoupon = await this.prisma.coupon.findFirst({
          where: {
            title: dto.title,
            storeId,
            id: { not: id },
          },
        });
        if (existingCoupon) {
          throw new BadRequestException('Coupon with this title already exists for this store');
        }
      }

      // Validate discount logic
      if (dto.discountPercentage && dto.discountAmount) {
        throw new BadRequestException('Cannot have both discount percentage and amount');
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

      // Check if coupon has associated usages
      const couponUsages = await this.prisma.couponUsage.findMany({
        where: { couponId: id },
      });
      if (couponUsages.length > 0) {
        throw new BadRequestException('Cannot delete coupon with associated usages');
      }

      return await this.prisma.coupon.delete({
        where: { id },
        select: this.couponSelect,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to remove coupon');
    }
  }

  async validateCoupon(couponId: string, orderAmount: number): Promise<{ valid: boolean; message?: string }> {
    try {
      const coupon = await this.findOne(couponId);

      if (!coupon.isActive) {
        return { valid: false, message: 'Coupon is not active' };
      }

      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return { valid: false, message: 'Coupon has expired' };
      }

      if (coupon.maxUses && coupon.timesUsed >= coupon.maxUses) {
        return { valid: false, message: 'Coupon usage limit reached' };
      }

      if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
        return { valid: false, message: `Minimum order amount required: ${coupon.minOrderAmount}` };
      }

      return { valid: true };
    } catch {
      return { valid: false, message: 'Invalid coupon' };
    }
  }

  async applyCoupon(couponId: string, orderAmount: number): Promise<{ discountAmount: number; finalAmount: number }> {
    try {
      const coupon = await this.findOne(couponId);
      const validation = await this.validateCoupon(couponId, orderAmount);

      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }

      let discountAmount = 0;

      if (coupon.discountPercentage) {
        discountAmount = (orderAmount * coupon.discountPercentage) / 100;
      } else if (coupon.discountAmount) {
        discountAmount = Math.min(coupon.discountAmount, orderAmount);
      }

      const finalAmount = orderAmount - discountAmount;

      return {
        discountAmount,
        finalAmount: Math.max(0, finalAmount),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to apply coupon');
    }
  }
}
