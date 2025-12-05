import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { ValidateCouponByPackageDto } from './dto/validate-coupon-by-package.dto';
import { CouponValidationResponseDto } from './dto/coupon-validation-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { OrderStatus } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { LoggedUser } from '../auth/logged-user.decorator';
import { User } from '../user/entities/user.entity';
import { OrderService } from './order.service';

@ApiTags('orders')
@Controller('orders')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'Get all orders for a store' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 6 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of orders returned successfully.',
    schema: {
      example: {
        data: [
          /* orders */
        ],
        totalOrders: 42,
        page: 1,
        totalPages: 7,
      },
    },
  })
  findAll(@Request() req, @Query('page') page = 1, @Query('limit') limit = 6) {
    return this.orderService.findAll(
      req.user.storeId,
      req.user.id,
      Number(page),
      Number(limit),
    );
  }

  @Get('admin')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiOperation({ summary: 'Get all orders for the logged admin store' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 6 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by order number or customer email',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by order status or use "all" to list every status',
    enum: ['all', ...Object.values(OrderStatus)],
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Filter by product id',
  })
  @ApiResponse({
    status: 200,
    description:
      'Paginated list of store orders returned successfully for admin users.',
    schema: {
      example: {
        data: [
          /* orders */
        ],
        totalOrders: 42,
        page: 1,
        totalPages: 7,
        products: [
          {
            id: 'product-123',
            name: 'Sample Product',
          },
        ],
      },
    },
  })
  findAllForStore(
    @LoggedUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 6,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('productId') productId?: string,
  ) {
    return this.orderService.findAllByStore(
      user.storeId,
      Number(page),
      Number(limit),
      search,
      status,
      productId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by id' })
  @ApiResponse({
    status: 200,
    description: 'Order found successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found.',
  })
  findOne(@Param('id') id: string, @Request() req) {
    return this.orderService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Package not found or payment method not available.',
  })
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    return this.orderService.create(createOrderDto, req.user.id);
  }

  @Post('validate-coupon-by-package')
  @ApiOperation({ summary: 'Validate a coupon for a specific package' })
  @ApiResponse({
    status: 200,
    description: 'Coupon validation result',
    type: CouponValidationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid coupon, package not found, or validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Package or payment method not found',
  })
  validateCouponByPackage(
    @Body() validateCouponByPackageDto: ValidateCouponByPackageDto,
    @Request() req,
  ) {
    return this.orderService.validateCouponByPackage(
      validateCouponByPackageDto.packageId,
      validateCouponByPackageDto.paymentMethodId,
      validateCouponByPackageDto.couponTitle,
      req.user.storeId,
      req.user.id,
    );
  }
}
