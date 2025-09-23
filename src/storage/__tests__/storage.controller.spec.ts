import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from '../storage.controller';
import { StorageService } from '../storage.service';

describe('StorageController', () => {
  let controller: StorageController;
  let storageService: any;

  const file: any = {
    fieldname: 'file',
    originalname: 'logo.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: Buffer.from([1, 2, 3]),
    size: 3,
  };

  beforeEach(async () => {
    const mockStorageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    } as Partial<StorageService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    controller = module.get<StorageController>(StorageController);
    storageService = module.get(StorageService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload file and return response', async () => {
      const folder = 'stores/store-123/logo';
      const fileUrl =
        'https://storage.googleapis.com/bucket/stores/store-123/logo/logo.png';
      storageService.uploadFile.mockResolvedValue(fileUrl);

      const result = await controller.uploadFile(file, { folder });

      expect(storageService.uploadFile).toHaveBeenCalledWith(file, folder);
      expect(result).toEqual({
        success: true,
        fileUrl,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      });
    });

    it('should throw when file is missing', async () => {
      await expect(
        controller.uploadFile(undefined as any, { folder: 'x' } as any),
      ).rejects.toThrow('No file provided');
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete file and return success', async () => {
      const encoded = encodeURIComponent(
        'https://storage.googleapis.com/bucket/path/to/file.png',
      );
      storageService.deleteFile.mockResolvedValue(undefined);

      const result = await controller.deleteFile(encoded);

      expect(storageService.deleteFile).toHaveBeenCalledWith(
        'https://storage.googleapis.com/bucket/path/to/file.png',
      );
      expect(result).toEqual({
        success: true,
        message: 'File deleted successfully',
      });
    });
  });
});
