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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';

@ApiTags('product')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('')
  @ApiOperation({ summary: 'Get all products without packages' })
  findAllForAdmin() {
    return this.productService.findAllForAdmin();
  }

  @Get('packages')
  @ApiOperation({ summary: 'Get all products with packages for a store' })
  @ApiQuery({
    name: 'storeId',
    required: true,
    description: 'Store ID to filter packages',
  })
  findAll(@Query('storeId') storeId: string) {
    return this.productService.findAll(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id with packages for a store' })
  @ApiQuery({
    name: 'storeId',
    required: true,
    description: 'Store ID to filter packages',
  })
  findOne(@Param('id') id: string, @Query('storeId') storeId: string) {
    return this.productService.findOne(id, storeId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product by id' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product by id' })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
