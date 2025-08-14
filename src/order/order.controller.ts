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
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CouponValidationResponseDto } from './dto/coupon-validation-response.dto';
import { OrderService } from './order.service';
import { AuthGuard } from '@nestjs/passport';


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
        data: [/* orders */],
        totalOrders: 42,
        page: 1,
        totalPages: 7
      }
    }
  })
  findAll(@Request() req, @Query('page') page = 1, @Query('limit') limit = 6) {
    return this.orderService.findAll(req.user.storeId, req.user.id, Number(page), Number(limit));
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

  @Post('validate-coupon')
  @ApiOperation({ summary: 'Validate a coupon for an order' })
  @ApiResponse({
    status: 200,
    description: 'Coupon validation result',
    type: CouponValidationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid coupon or validation failed',
  })
  validateCoupon(@Body() validateCouponDto: ValidateCouponDto, @Request() req) {
    return this.orderService.validateCoupon(validateCouponDto, req.user.storeId, req.user.id);
  }

  @Post('apply-coupon')
  @ApiOperation({ summary: 'Apply a coupon to calculate final price' })
  @ApiResponse({
    status: 200,
    description: 'Coupon applied successfully with final price',
    type: CouponValidationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid coupon or application failed',
  })
  applyCoupon(@Body() validateCouponDto: ValidateCouponDto, @Request() req) {
    return this.orderService.applyCoupon(
      validateCouponDto.couponTitle,
      validateCouponDto.orderAmount,
      req.user.storeId,
      req.user.id
    );
  }
}
