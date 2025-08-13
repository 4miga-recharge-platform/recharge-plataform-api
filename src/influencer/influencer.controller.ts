import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CreateInfluencerDto } from './dto/create-influencer.dto';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';
import { InfluencerService } from './influencer.service';

@ApiTags('influencer')
@Controller('influencer')
export class InfluencerController {
  constructor(private readonly influencerService: InfluencerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all influencers' })
  @ApiQuery({ name: 'storeId', required: false, description: 'Filter by store ID' })
  findAll(@Query('storeId') storeId?: string) {
    if (storeId) {
      return this.influencerService.findByStore(storeId);
    }
    return this.influencerService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new influencer' })
  create(@Body() createInfluencerDto: CreateInfluencerDto) {
    return this.influencerService.create(createInfluencerDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an influencer by id' })
  findOne(@Param('id') id: string) {
    return this.influencerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an influencer by id' })
  update(@Param('id') id: string, @Body() updateInfluencerDto: UpdateInfluencerDto) {
    return this.influencerService.update(id, updateInfluencerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an influencer by id' })
  remove(@Param('id') id: string) {
    return this.influencerService.remove(id);
  }
}
