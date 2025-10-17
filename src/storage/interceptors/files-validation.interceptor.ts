import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class FilesValidationInterceptor implements NestInterceptor {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB por arquivo

  // Limite de arquivos por requisição (facilmente ajustável futuramente)
  private readonly maxFilesPerRequest = 5;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const files: any[] = request.files || [];

    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    if (files.length > this.maxFilesPerRequest) {
      throw new BadRequestException(
        `Too many files. Maximum ${this.maxFilesPerRequest} files are allowed per request`,
      );
    }

    for (const file of files) {
      this.validateFile(file);
    }

    return next.handle();
  }

  private validateFile(file: any): void {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size allowed: ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }
  }
}



