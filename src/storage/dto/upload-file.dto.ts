import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    description: 'Folder path where the file should be stored',
    example: 'stores/store-123/logo',
  })
  @IsString()
  @IsNotEmpty()
  folder: string;
}

export class UploadFileResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Public URL of the uploaded file with cache busting timestamp',
    example: 'https://storage.googleapis.com/bucket/stores/store-123/logo/image.jpg?v=1703123456',
  })
  fileUrl: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'logo.png',
  })
  originalName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 12345,
  })
  size: number;

  @ApiProperty({
    description: 'File MIME type',
    example: 'image/png',
  })
  mimetype: string;
}

export class DeleteFileResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'File deleted successfully',
  })
  message: string;
}

export class GetFileUrlWithTimestampDto {
  @ApiProperty({
    description: 'File path in the bucket',
    example: 'stores/store-123/logo/image.jpg',
  })
  @IsString()
  @IsNotEmpty()
  filePath: string;
}

export class GetFileUrlWithTimestampResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'File URL with timestamp for cache busting',
    example: 'https://storage.googleapis.com/bucket/stores/store-123/logo/image.jpg?v=1703123456',
  })
  fileUrl: string;

  @ApiProperty({
    description: 'Timestamp used for cache busting',
    example: 1703123456,
  })
  timestamp: number;

  @ApiProperty({
    description: 'Original file path',
    example: 'stores/store-123/logo/image.jpg',
  })
  filePath: string;
}
