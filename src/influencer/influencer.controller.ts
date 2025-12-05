import {
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
import { CouponService } from '../coupon/coupon.service';
import { CreateInfluencerDto } from './dto/create-influencer.dto';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';
import { InfluencerService } from './influencer.service';

@ApiTags('influencer')
@Controller('influencer')
@UseGuards(AuthGuard('jwt'), RoleGuard)
@ApiBearerAuth()
export class InfluencerController {
  constructor(
    private readonly influencerService: InfluencerService,
    private readonly couponService: CouponService,
  ) {}

  @Get()
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiOperation({ summary: 'Get all influencers with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or email',
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
    description: 'Paginated list of influencers returned successfully.',
    schema: {
      example: {
        data: [
          /* influencers */
        ],
        totalInfluencers: 25,
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
    @Query('status') status?: string,
  ) {
    // Converter status para boolean se necessário
    let isActiveBoolean: boolean | undefined;
    if (status === 'active') {
      isActiveBoolean = true;
    } else if (status === 'inactive') {
      isActiveBoolean = false;
    }
    // Se status for 'all' ou undefined, isActiveBoolean fica undefined (retorna todos)

    return this.influencerService.findByStore(
      req.user.storeId,
      Number(page),
      Number(limit),
      search,
      isActiveBoolean,
    );
  }

  @Get('name-id-list')
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiOperation({
    summary: 'Get all influencers list (id and name only, not paginated)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all influencers returned successfully.',
  })
  findAllSimple(@Request() req) {
    return this.influencerService.findAllByStoreSimple(req.user.storeId);
  }

  @Post()
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiOperation({ summary: 'Create a new influencer' })
  create(@Body() createInfluencerDto: CreateInfluencerDto, @Request() req) {
    return this.influencerService.create(createInfluencerDto, req.user.storeId);
  }

  @Get(':id')
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiOperation({ summary: 'Get an influencer by id' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.influencerService.findOne(id, req.user.storeId);
  }

  @Get(':id/sales-history')
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiOperation({
    summary: 'Get sales history for an influencer with pagination and filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Filter by year (e.g., 2024)',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: Number,
    description: 'Filter by month (1-12)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated sales history returned successfully.',
    schema: {
      example: {
        data: [
          {
            id: 'sales-123',
            influencerId: 'influencer-123',
            month: 12,
            year: 2024,
            totalSales: 1500.5,
            createdAt: '2024-12-01T00:00:00.000Z',
            updatedAt: '2024-12-01T00:00:00.000Z',
          },
        ],
        totalSales: 25,
        page: 1,
        totalPages: 3,
        influencerName: 'João Silva',
      },
    },
  })
  getSalesHistory(
    @Param('id') id: string,
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    return this.influencerService.getSalesHistory(
      id,
      req.user.storeId,
      Number(page),
      Number(limit),
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }

  @Get(':id/coupons')
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiOperation({
    summary: 'Get all coupons for an influencer with pagination and filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by coupon title',
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
    description:
      'Paginated list of coupons for the influencer returned successfully.',
    schema: {
      example: {
        data: [
          {
            id: 'coupon-123',
            title: 'Desconto 10%',
            influencerId: 'influencer-123',
            discountPercentage: 10,
            discountAmount: null,
            expiresAt: '2024-12-31T23:59:59.000Z',
            timesUsed: 5,
            totalSalesAmount: 500.0,
            maxUses: 100,
            minOrderAmount: 50.0,
            isActive: true,
            isFirstPurchase: false,
            storeId: 'store-123',
          },
        ],
        totalCoupons: 15,
        page: 1,
        totalPages: 2,
        influencerName: 'João Silva',
      },
    },
  })
  getInfluencerCoupons(
    @Param('id') id: string,
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.couponService.findByInfluencerWithPagination(
      id,
      req.user.storeId,
      Number(page),
      Number(limit),
      search,
      status,
    );
  }

  @Patch(':id')
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiOperation({ summary: 'Update an influencer by id' })
  update(
    @Param('id') id: string,
    @Body() updateInfluencerDto: UpdateInfluencerDto,
    @Request() req,
  ) {
    return this.influencerService.update(
      id,
      updateInfluencerDto,
      req.user.storeId,
    );
  }

  @Delete(':id')
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiOperation({ summary: 'Delete an influencer by id' })
  remove(@Param('id') id: string, @Request() req) {
    return this.influencerService.remove(id, req.user.storeId);
  }
}
