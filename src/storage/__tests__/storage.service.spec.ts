import { env } from '../../env';
import { StorageService } from '../storage.service';

jest.mock('@google-cloud/storage', () => {
  const fileMock = {
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const bucketMock = {
    file: jest.fn(() => fileMock),
  };
  const storageMock = {
    bucket: jest.fn(() => bucketMock),
  };
  return { Storage: jest.fn(() => storageMock) };
});

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    const file: any = {
      fieldname: 'file',
      originalname: 'Meu Arquivo ãé.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from([1, 2, 3]),
      size: 3,
    };

    it('should upload with sanitized filename when desiredFileName not provided', async () => {
      const url = await service.uploadFile(file, 'stores/store-123/logo');

      expect(url).toMatch(
        /^https:\/\/storage\.googleapis\.com\/.+\/stores\/store-123\/logo\//,
      );
    });

    it('should upload with deterministic filename when desiredFileName is provided', async () => {
      const url = await service.uploadFile(
        file,
        'stores/store-123/logo',
        'card.JPG',
      );

      expect(url).toMatch(
        new RegExp(`^https://storage\\.googleapis\\.com/${env.GCP_BUCKET_NAME || '4miga-images'}/stores/store-123/logo/card\\.jpg\\?v=\\d+$`),
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const fileUrl = 'https://storage.googleapis.com/bucket/path/to/file.png';
      await expect(service.deleteFile(fileUrl)).resolves.toBeUndefined();
    });
  });

  describe('getFileUrl', () => {
    it('should return full file URL', async () => {
      const url = await service.getFileUrl('path/to/file.png');
      expect(url).toBe(
        `https://storage.googleapis.com/${env.GCP_BUCKET_NAME || '4miga-images'}/path/to/file.png`,
      );
    });
  });

  describe('getBucketUrl', () => {
    it('should return bucket base URL', () => {
      const url = service.getBucketUrl();
      expect(url).toBe(
        `https://storage.googleapis.com/${env.GCP_BUCKET_NAME || '4miga-images'}`,
      );
    });
  });
});
