import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponService } from './coupon.service';

@ApiTags('coupon')
@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get()
  @ApiOperation({ summary: 'Get all coupons' })
  @ApiQuery({ name: 'storeId', required: false, description: 'Filter by store ID' })
  @ApiQuery({ name: 'influencerId', required: false, description: 'Filter by influencer ID' })
  findAll(
    @Query('storeId') storeId?: string,
    @Query('influencerId') influencerId?: string,
  ) {
    if (storeId) {
      return this.couponService.findByStore(storeId);
    }
    if (influencerId) {
      return this.couponService.findByInfluencer(influencerId);
    }
    return this.couponService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active coupons by store' })
  @ApiQuery({ name: 'storeId', required: true, description: 'Store ID' })
  findActiveByStore(@Query('storeId') storeId: string) {
    return this.couponService.findActiveByStore(storeId);
  }

  @Get('first-purchase')
  @ApiOperation({ summary: 'Get first purchase coupons by store' })
  @ApiQuery({ name: 'storeId', required: true, description: 'Store ID' })
  findFirstPurchaseByStore(@Query('storeId') storeId: string) {
    return this.couponService.findFirstPurchaseByStore(storeId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new coupon' })
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponService.create(createCouponDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a coupon by id' })
  findOne(@Param('id') id: string) {
    return this.couponService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon by id' })
  update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return this.couponService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coupon by id' })
  remove(@Param('id') id: string) {
    return this.couponService.remove(id);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate a coupon for an order' })
  @ApiQuery({ name: 'orderAmount', required: true, description: 'Order amount' })
  validateCoupon(
    @Param('id') id: string,
    @Query('orderAmount') orderAmount: string,
  ) {
    const amount = parseFloat(orderAmount);
    if (isNaN(amount) || amount < 0) {
      throw new BadRequestException('Invalid order amount');
    }
    return this.couponService.validateCoupon(id, amount);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply a coupon to an order' })
  @ApiQuery({ name: 'orderAmount', required: true, description: 'Order amount' })
  applyCoupon(
    @Param('id') id: string,
    @Query('orderAmount') orderAmount: string,
  ) {
    const amount = parseFloat(orderAmount);
    if (isNaN(amount) || amount < 0) {
      throw new BadRequestException('Invalid order amount');
    }
    return this.couponService.applyCoupon(id, amount);
  }
}
