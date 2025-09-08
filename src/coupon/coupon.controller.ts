import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@ApiTags('coupon')
@Controller('coupon')
@UseGuards(AuthGuard('jwt'), RoleGuard)
@ApiBearerAuth()
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get()
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiOperation({ summary: 'Get all coupons with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by title or influencer name',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description:
      'Filter by coupon type: all, percentage, fixed, first-purchase',
    enum: ['all', 'percentage', 'fixed', 'first-purchase'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by status: all, active, or inactive',
    enum: ['all', 'active', 'inactive'],
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of coupons returned successfully.',
    schema: {
      example: {
        data: [
          /* coupons */
        ],
        totalCoupons: 25,
        page: 1,
        totalPages: 3,
      },
    },
  })
  findAll(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    // Convert status to boolean if necessary
    let isActiveBoolean: boolean | undefined;
    if (status === 'active') {
      isActiveBoolean = true;
    } else if (status === 'inactive') {
      isActiveBoolean = false;
    }
    // If status is 'all' or undefined, isActiveBoolean remains undefined (returns all)

    return this.couponService.findByStore(
      req.user.storeId,
      Number(page),
      Number(limit),
      search,
      type,
      isActiveBoolean,
    );
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
  @ApiQuery({
    name: 'orderAmount',
    required: true,
    description: 'Order amount',
  })
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
  @ApiQuery({
    name: 'orderAmount',
    required: true,
    description: 'Order amount',
  })
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
