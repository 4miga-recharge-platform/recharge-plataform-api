import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { env } from '../env';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor() {
    this.bucketName = env.GCP_BUCKET_NAME || 'recharge-plataform-bucket';

    if (env.GCP_PROJECT_ID && env.GCP_CLIENT_EMAIL && env.GCP_PRIVATE_KEY) {
      this.storage = new Storage({
        projectId: env.GCP_PROJECT_ID,
        credentials: {
          client_email: env.GCP_CLIENT_EMAIL,
          private_key: env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      });
      this.logger.log(`GCP Storage initialized with bucket: ${this.bucketName}`);
    } else {
      this.storage = new Storage();
      this.logger.warn('GCP Storage initialized without credentials (using default auth)');
    }
  }

  async uploadFile(
    file: UploadedFile,
    folderPath: string,
  ): Promise<string> {
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = `${folderPath}/${fileName}`;

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const fileUpload = bucket.file(filePath);

      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
      this.logger.log(`File uploaded successfully: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const fileName = this.extractFileNameFromUrl(fileUrl);
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      await file.delete();
      this.logger.log(`File deleted successfully: ${fileUrl}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    return `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
  }

  getBucketUrl(): string {
    return `https://storage.googleapis.com/${this.bucketName}`;
  }

  private extractFileNameFromUrl(fileUrl: string): string {
    const url = new URL(fileUrl);
    return url.pathname.substring(1);
  }
}
