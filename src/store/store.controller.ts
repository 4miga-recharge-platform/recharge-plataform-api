import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('store')
@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  @ApiOperation({ summary: 'Get all stores' })
  findAll() {
    return this.storeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a store by id' })
  findOne(@Param('id') id: string) {
    return this.storeService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a store' })
  create(@Body() createStoreDto: CreateStoreDto) {
    return this.storeService.create(createStoreDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a store by id' })
  update(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto) {
    return this.storeService.update(id, updateStoreDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a store by id' })
  remove(@Param('id') id: string) {
    return this.storeService.remove(id);
  }
}
