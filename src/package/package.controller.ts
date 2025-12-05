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
import { PackageService } from './package.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { FileValidationInterceptor } from '../storage/interceptors/file-validation.interceptor';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LoggedUser } from '../auth/logged-user.decorator';
import { User } from '../user/entities/user.entity';

interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@ApiTags('package')
@Controller('package')
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  @Get()
  @ApiOperation({ summary: 'Get all packages from a specific store' })
  findAll(@Query('storeId') storeId: string) {
    return this.packageService.findAll(storeId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a package' })
  create(@Body() createPackageDto: CreatePackageDto, @LoggedUser() user: User) {
    return this.packageService.create(createPackageDto, user.storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a package by id' })
  findOne(@Param('id') id: string) {
    return this.packageService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a package by id' })
  update(@Param('id') id: string, @Body() updatePackageDto: UpdatePackageDto) {
    return this.packageService.update(id, updatePackageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a package by id' })
  remove(@Param('id') id: string) {
    return this.packageService.remove(id);
  }

  @Post(':id/images/card')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @UseInterceptors(FileInterceptor('file'), FileValidationInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload package card image' })
  @ApiQuery({
    name: 'updateAllPackages',
    required: false,
    type: Boolean,
    description:
      'If true, updates all packages from the same product. If false, updates only the specified package.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Package card image upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file for package card',
        },
      },
      required: ['file'],
    },
  })
  async uploadCardImage(
    @Param('id') packageId: string,
    @UploadedFile() file: FileUpload,
    @Query('updateAllPackages') updateAllPackages: string | undefined,
    @LoggedUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Convert string query parameter to boolean
    const shouldUpdateAll = updateAllPackages === 'true';

    return this.packageService.uploadCardImage(
      packageId,
      file,
      user.storeId,
      shouldUpdateAll,
    );
  }

  @Post('images/cleanup')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Cleanup unreferenced package images for a product in the current store',
  })
  @ApiQuery({ name: 'productId', required: false, type: String })
  cleanupImages(
    @Query('productId') productId: string | undefined,
    @LoggedUser() user: User,
  ) {
    return this.packageService.cleanupPackageImages(productId, user.storeId);
  }
}
