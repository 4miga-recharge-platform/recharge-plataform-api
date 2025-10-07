import { Storage } from '@google-cloud/storage';
import { Injectable, Logger } from '@nestjs/common';
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
    this.bucketName = env.GCP_BUCKET_NAME || '4miga-images';

    this.logger.log(
      `GCP_PROJECT_ID: ${env.GCP_PROJECT_ID ? 'SET' : 'NOT SET'}`,
    );
    this.logger.log(
      `GCP_CLIENT_EMAIL: ${env.GCP_CLIENT_EMAIL ? 'SET' : 'NOT SET'}`,
    );
    this.logger.log(
      `GCP_PRIVATE_KEY: ${env.GCP_PRIVATE_KEY ? 'SET' : 'NOT SET'}`,
    );
    this.logger.log(`GCP_BUCKET_NAME: ${this.bucketName}`);

    if (env.GCP_PROJECT_ID && env.GCP_CLIENT_EMAIL && env.GCP_PRIVATE_KEY) {
      this.storage = new Storage({
        projectId: env.GCP_PROJECT_ID,
        credentials: {
          client_email: env.GCP_CLIENT_EMAIL,
          private_key: env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      });
      this.logger.log(
        `GCP Storage initialized with bucket: ${this.bucketName}`,
      );
    } else {
      this.storage = new Storage();
      this.logger.warn(
        'GCP Storage initialized without credentials (using default auth)',
      );
    }
  }

  private sanitizeFilename(originalName: string): string {
    const trimmed = originalName.trim();
    const replacedSpaces = trimmed.replace(/\s+/g, '-');
    const normalized = replacedSpaces
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '');
    const cleaned = normalized.replace(/[^a-zA-Z0-9._-]/g, '');
    return cleaned.toLowerCase();
  }

  async uploadFile(
    file: UploadedFile,
    folderPath: string,
    desiredFileName?: string,
  ): Promise<string> {
    const baseName = desiredFileName
      ? this.sanitizeFilename(desiredFileName)
      : `${Date.now()}-${this.sanitizeFilename(file.originalname)}`;
    const filePath = `${folderPath}/${baseName}`;

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const fileUpload = bucket.file(filePath);

      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      // Sempre retorna URL com timestamp para evitar cache
      const publicUrl = this.getFileUrlWithTimestamp(filePath);

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
      // Ignore NOT FOUND errors to make deletion idempotent and robust
      const message = (error as any)?.message || '';
      if (message.includes('No such object')) {
        this.logger.warn(`File not found during delete (ignoring): ${fileUrl}`);
        return;
      }
      this.logger.error(`Failed to delete file: ${message}`);
      throw new Error(`Delete failed: ${message}`);
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    return `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
  }

  async listFiles(prefix: string): Promise<string[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [files] = await bucket.getFiles({ prefix });
      return files.map(f => f.name);
    } catch (error) {
      this.logger.error(`Failed to list files for prefix ${prefix}: ${error.message}`);
      throw new Error(`List failed: ${error.message}`);
    }
  }

  /**
   * Gera URL do arquivo com timestamp para evitar cache
   * @param filePath Caminho do arquivo no bucket
   * @param timestamp Timestamp opcional (se não fornecido, usa Date.now())
   * @returns URL com parâmetro de versioning
   */
  getFileUrlWithTimestamp(filePath: string, timestamp?: number): string {
    const baseUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
    const version = timestamp || Date.now();
    return `${baseUrl}?v=${version}`;
  }

  /**
   * Gera URL do arquivo com timestamp baseado na data de modificação
   * @param filePath Caminho do arquivo no bucket
   * @returns Promise com URL com parâmetro de versioning baseado na data de modificação
   */
  async getFileUrlWithMetadataTimestamp(filePath: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      const [metadata] = await file.getMetadata();

      const timestamp = new Date(metadata.updated || Date.now()).getTime();
      return this.getFileUrlWithTimestamp(filePath, timestamp);
    } catch (error) {
      this.logger.warn(
        `Could not get metadata for ${filePath}, using current timestamp: ${error.message}`,
      );
      return this.getFileUrlWithTimestamp(filePath);
    }
  }

  getBucketUrl(): string {
    return `https://storage.googleapis.com/${this.bucketName}`;
  }

  private extractFileNameFromUrl(fileUrl: string): string {
    const url = new URL(fileUrl);
    const pathname = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    // pathname may be "<bucket>/<filePath>" for public URLs; strip leading bucket segment if present
    if (pathname.startsWith(`${this.bucketName}/`)) {
      return pathname.substring(this.bucketName.length + 1);
    }
    return pathname;
  }
}
