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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { LoggedUser } from '../auth/logged-user.decorator';
import { FileValidationInterceptor } from '../storage/interceptors/file-validation.interceptor';
import { User } from '../user/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateStoreProductSettingsDto } from './dto/create-store-product-settings.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStoreProductSettingsDto } from './dto/update-store-product-settings.dto';
import { ProductService } from './product.service';

interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

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

  // StoreProductSettings routes
  @Post('customize')
  @ApiOperation({ summary: 'Create product customization for a store' })
  createCustomization(
    @Body() createStoreProductSettingsDto: CreateStoreProductSettingsDto,
  ) {
    return this.productService.createStoreProductSettings(
      createStoreProductSettingsDto,
    );
  }

  @Patch('customize/:productId')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update product customization for logged user store',
  })
  updateCustomization(
    @Param('productId') productId: string,
    @Body() updateStoreProductSettingsDto: UpdateStoreProductSettingsDto,
    @LoggedUser() user: User,
  ) {
    return this.productService.updateStoreProductSettings(
      user.storeId,
      productId,
      updateStoreProductSettingsDto,
    );
  }

  @Delete('customize/:id')
  @ApiOperation({ summary: 'Delete product customization by id' })
  removeCustomization(@Param('id') id: string) {
    return this.productService.removeStoreProductSettings(id);
  }

  @Post(':productId/images/banner')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @UseInterceptors(FileInterceptor('file'), FileValidationInterceptor)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload product banner image for store customization',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Product banner image upload for store customization',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file for product banner',
        },
      },
      required: ['file'],
    },
  })
  async uploadStoreProductBanner(
    @Param('productId') productId: string,
    @UploadedFile() file: FileUpload,
    @LoggedUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.productService.updateStoreProductImage(
      user.storeId,
      productId,
      file,
      'banner',
    );
  }

  @Post(':productId/images/card')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @UseInterceptors(FileInterceptor('file'), FileValidationInterceptor)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload product card image for store customization',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Product card image upload for store customization',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file for product card',
        },
      },
      required: ['file'],
    },
  })
  async uploadStoreProductCard(
    @Param('productId') productId: string,
    @UploadedFile() file: FileUpload,
    @LoggedUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.productService.updateStoreProductImage(
      user.storeId,
      productId,
      file,
      'card',
    );
  }

  @Get('bigo')
  @ApiOperation({ summary: 'Get Bigo product with packages for a store' })
  @ApiQuery({
    name: 'storeId',
    required: true,
    description: 'Store ID to filter packages',
  })
  findBigoProduct(@Query('storeId') storeId: string) {
    return this.productService.findBigoProduct(storeId);
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
