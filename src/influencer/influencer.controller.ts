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
import { CreateInfluencerDto } from './dto/create-influencer.dto';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';
import { InfluencerService } from './influencer.service';

@ApiTags('influencer')
@Controller('influencer')
@UseGuards(AuthGuard('jwt'), RoleGuard)
@ApiBearerAuth()
export class InfluencerController {
  constructor(private readonly influencerService: InfluencerService) {}

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
