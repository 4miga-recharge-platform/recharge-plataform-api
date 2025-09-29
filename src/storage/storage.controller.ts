import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DeleteFileResponseDto,
  UploadFileDto,
  UploadFileResponseDto,
} from './dto/upload-file.dto';
import { FileValidationInterceptor } from './interceptors/file-validation.interceptor';
import { StorageService } from './storage.service';

interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'), FileValidationInterceptor)
  @ApiOperation({ summary: 'Upload a file to storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload with folder path',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload',
        },
        folder: {
          type: 'string',
          description: 'Folder path in bucket (e.g., stores/store-123/logo)',
          example: 'stores/store-123/logo',
        },
      },
      required: ['file', 'folder'],
    },
  })
  async uploadFile(
    @UploadedFile() file: FileUpload,
    @Body() uploadFileDto: UploadFileDto,
  ): Promise<UploadFileResponseDto> {
    if (!file) {
      throw new Error('No file provided');
    }

    const fileUrl = await this.storageService.uploadFile(
      file,
      uploadFileDto.folder,
    );

    return {
      success: true,
      fileUrl,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Delete('file/*')
  @ApiOperation({ summary: 'Delete a file from storage' })
  async deleteFile(
    @Param('0') fileUrl: string,
  ): Promise<DeleteFileResponseDto> {
    await this.storageService.deleteFile(decodeURIComponent(fileUrl));

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }
}
