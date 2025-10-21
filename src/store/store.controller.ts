import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LoggedUser } from '../auth/logged-user.decorator';
import { User } from '../user/entities/user.entity';
import { FileValidationInterceptor } from '../storage/interceptors/file-validation.interceptor';
import { FilesValidationInterceptor } from '../storage/interceptors/files-validation.interceptor';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { RemoveBannersBatchDto } from './dto/remove-banners-batch.dto';
import { StoreService } from './store.service';

interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@ApiTags('store')
@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  @ApiOperation({ summary: 'Get all stores' })
  findAll() {
    return this.storeService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a store' })
  create(@Body() createStoreDto: CreateStoreDto) {
    return this.storeService.create(createStoreDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a store by id' })
  findOne(@Param('id') id: string) {
    return this.storeService.findOne(id);
  }

  @Patch()
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a store' })
  async update(@LoggedUser() user: User, @Body() updateStoreDto: UpdateStoreDto) {
    if (!user.storeId){
      throw new BadRequestException('Store ID not found in user data')
    }
    return this.storeService.update(user.storeId, updateStoreDto);
  }

  @Delete('offer-banner')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove store offer banner image' })
  async removeOfferBanner(@LoggedUser() user: User) {
    if (!user.storeId) {
      throw new BadRequestException('Store ID not found in user data');
    }
    return this.storeService.removeOfferBanner(user.storeId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a store by id' })
  remove(@Param('id') id: string) {
    return this.storeService.remove(id);
  }

  @Post('banners')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @UseInterceptors(FileInterceptor('file'), FileValidationInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload store banner image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Store banner image upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file for store banner',
        },
      },
      required: ['file'],
    },
  })
  async uploadBanner(
    @UploadedFile() file: FileUpload,
    @LoggedUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.storeService.addBanner(user.storeId, file);
  }

  @Delete('banners/batch')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete multiple store banners by indices' })
  async deleteBannersBatch(
    @Body() removeBannersDto: RemoveBannersBatchDto,
    @LoggedUser() user: User,
  ) {
    return this.storeService.removeMultipleBanners(
      user.storeId,
      removeBannersDto.indices,
    );
  }

  @Delete('banners/:bannerIndex')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete store banner by index' })
  async deleteBanner(
    @Param('bannerIndex') bannerIndex: string,
    @LoggedUser() user: User,
  ) {
    const index = parseInt(bannerIndex, 10);
    if (isNaN(index) || index < 0) {
      throw new BadRequestException('Invalid banner index');
    }

    return this.storeService.removeBanner(user.storeId, index);
  }

  @Post('banners/batch')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @UseInterceptors(FilesInterceptor('files'), FilesValidationInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload multiple store banner images (flexible)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload multiple banner images to be appended to current list',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Up to 5 image files',
        },
      },
      required: ['files'],
    },
  })
  async uploadBannersBatch(
    @UploadedFiles() files: any[],
    @LoggedUser() user: User,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return this.storeService.addMultipleBanners(user.storeId, files);
  }

  @Post('offer-banner')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @UseInterceptors(FileInterceptor('file'), FileValidationInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload store offer banner image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Store offer banner image upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file for store offer banner',
        },
      },
      required: ['file'],
    },
  })
  async uploadOfferBanner(
    @UploadedFile() file: FileUpload,
    @LoggedUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.storeService.uploadOfferBanner(user.storeId, file);
  }
}
