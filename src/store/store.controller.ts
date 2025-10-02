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
  ApiTags,
} from '@nestjs/swagger';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LoggedUser } from '../auth/logged-user.decorator';
import { User } from '../user/entities/user.entity';
import { FileValidationInterceptor } from '../storage/interceptors/file-validation.interceptor';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
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

  @Post(':storeId/banners')
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
    @Param('storeId') storeId: string,
    @UploadedFile() file: FileUpload,
    @LoggedUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.storeService.addBanner(storeId, file, user.storeId);
  }

  @Delete(':storeId/banners/:bannerIndex')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete store banner by index' })
  async deleteBanner(
    @Param('storeId') storeId: string,
    @Param('bannerIndex') bannerIndex: string,
    @LoggedUser() user: User,
  ) {
    const index = parseInt(bannerIndex, 10);
    if (isNaN(index) || index < 0) {
      throw new BadRequestException('Invalid banner index');
    }

    return this.storeService.removeBanner(storeId, index, user.storeId);
  }
}
