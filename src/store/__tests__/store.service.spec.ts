import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StoreService } from '../store.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { CreateStoreDto } from '../dto/create-store.dto';
import { UpdateStoreDto } from '../dto/update-store.dto';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

// Mock validation utility
jest.mock('../../utils/validation.util', () => ({
  validateRequiredFields: jest.fn(),
}));

describe('StoreService', () => {
  let service: StoreService;
  let prismaService: any;

  const mockStore = {
    id: 'store-123',
    name: 'Loja Exemplo',
    email: 'loja@exemplo.com',
    wppNumber: '+5511999999999',
    instagramUrl: 'https://instagram.com/lojaexemplo',
    facebookUrl: 'https://facebook.com/lojaexemplo',
    tiktokUrl: 'https://tiktok.com/@lojaexemplo',
    logoUrl: 'https://example.com/logo.png',
    miniLogoUrl: 'https://example.com/mini-logo.png',
    faviconUrl: 'https://example.com/favicon.ico',
    bannersUrl: ['https://example.com/banner1.png', 'https://example.com/banner2.png'],
    onSaleUrlImg: 'https://example.com/on-sale.png',
  };

  const mockStoreSelect = {
    id: true,
    name: true,
    email: true,
    domain: true,
    wppNumber: true,
    instagramUrl: true,
    facebookUrl: true,
    tiktokUrl: true,
    logoUrl: true,
    miniLogoUrl: true,
    faviconUrl: true,
    bannersUrl: true,
    onSaleUrlImg: true,
    createdAt: false,
    updatedAt: false,
    users: false,
    packages: false,
    orders: false,
  };

  let mockStorageService: any;

  beforeEach(async () => {
    const mockPrismaService = {
      store: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    mockStorageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      getFileUrlWithTimestamp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all stores successfully', async () => {
      const stores = [mockStore];
      prismaService.store.findMany.mockResolvedValue(stores);

      const result = await service.findAll();

      expect(prismaService.store.findMany).toHaveBeenCalledWith({
        select: mockStoreSelect,
      });
      expect(result).toEqual(stores);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.store.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll()).rejects.toThrow(
        new BadRequestException('Failed to fetch stores'),
      );
    });
  });

  describe('findOne', () => {
    const storeId = 'store-123';

    it('should return a store successfully', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);

      const result = await service.findOne(storeId);

      expect(prismaService.store.findUnique).toHaveBeenCalledWith({
        where: { id: storeId },
        select: mockStoreSelect,
      });
      expect(result).toEqual(mockStore);
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.findOne(storeId)).rejects.toThrow(
        new BadRequestException('Failed to fetch store'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.store.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(storeId)).rejects.toThrow(
        new BadRequestException('Failed to fetch store'),
      );
    });
  });

  describe('create', () => {
    const createStoreDto: CreateStoreDto = {
      name: 'Nova Loja',
      email: 'nova@loja.com',
      domain: 'https://www.novaloja.com',
      wppNumber: '+5511999999999',
      instagramUrl: 'https://instagram.com/novaloja',
    };

    it('should create a store successfully', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.hash.mockResolvedValue('hashedPassword');

      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.store.create.mockResolvedValue(mockStore);

      const result = await service.create(createStoreDto);

      expect(validateRequiredFields).toHaveBeenCalledWith(
        createStoreDto,
        ['name', 'email'],
      );

      expect(prismaService.store.create).toHaveBeenCalledWith({
        data: createStoreDto,
        select: mockStoreSelect,
      });

      expect(result).toEqual(mockStore);
    });

    it('should throw BadRequestException when validation fails', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {
        throw new BadRequestException('Validation failed');
      });

      await expect(service.create(createStoreDto)).rejects.toThrow(
        new BadRequestException('Failed to create store'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.store.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createStoreDto)).rejects.toThrow(
        new BadRequestException('Failed to create store'),
      );
    });
  });

  describe('update', () => {
    const storeId = 'store-123';
    const updateStoreDto: UpdateStoreDto = {
      name: 'Loja Atualizada',
      email: 'atualizada@loja.com',
    };

    it('should update a store successfully', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.store.update.mockResolvedValue({ ...mockStore, ...updateStoreDto });

      const result = await service.update(storeId, updateStoreDto);

      expect(prismaService.store.findUnique).toHaveBeenCalledWith({
        where: { id: storeId },
        select: mockStoreSelect,
      });

      expect(validateRequiredFields).toHaveBeenCalledWith(updateStoreDto, ['name', 'email']);

      expect(prismaService.store.update).toHaveBeenCalledWith({
        where: { id: storeId },
        data: updateStoreDto,
        select: mockStoreSelect,
      });

      expect(result).toEqual({ ...mockStore, ...updateStoreDto });
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.update(storeId, updateStoreDto)).rejects.toThrow(
        new BadRequestException('Failed to update store'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.store.update.mockRejectedValue(new Error('Database error'));

      await expect(service.update(storeId, updateStoreDto)).rejects.toThrow(
        new BadRequestException('Failed to update store'),
      );
    });
  });

  describe('remove', () => {
    const storeId = 'store-123';

    it('should remove a store successfully', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.store.delete.mockResolvedValue(mockStore);

      const result = await service.remove(storeId);

      expect(prismaService.store.findUnique).toHaveBeenCalledWith({
        where: { id: storeId },
        select: mockStoreSelect,
      });

      expect(prismaService.store.delete).toHaveBeenCalledWith({
        where: { id: storeId },
        select: mockStoreSelect,
      });

      expect(result).toEqual(mockStore);
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.remove(storeId)).rejects.toThrow(
        new BadRequestException('Failed to remove store'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.store.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.remove(storeId)).rejects.toThrow(
        new BadRequestException('Failed to remove store'),
      );
    });
  });

  describe('addBanner', () => {
    const storeId = 'store-123';
    const mockFile = {
      fieldname: 'file',
      originalname: 'banner.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('fake-image-data'),
      size: 1024,
    };

    it('should add a banner successfully', async () => {
      mockStorageService.uploadFile.mockResolvedValue('https://storage.com/banner.png');

      prismaService.store.findUnique.mockResolvedValue({
        id: storeId,
        bannersUrl: ['https://storage.com/existing-banner.png'],
      });

      const updatedStore = {
        ...mockStore,
        bannersUrl: ['https://storage.com/existing-banner.png', 'https://storage.com/banner.png'],
      };

      prismaService.store.update.mockResolvedValue(updatedStore);

      const result = await service.addBanner(storeId, mockFile);

      expect(prismaService.store.findUnique).toHaveBeenCalledWith({
        where: { id: storeId },
        select: { id: true, bannersUrl: true },
      });

      expect(mockStorageService.uploadFile).toHaveBeenCalled();
      expect(prismaService.store.update).toHaveBeenCalledWith({
        where: { id: storeId },
        data: {
          bannersUrl: ['https://storage.com/existing-banner.png', 'https://storage.com/banner.png'],
        },
        select: mockStoreSelect,
      });

      expect(result.success).toBe(true);
      expect(result.store).toEqual(updatedStore);
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.addBanner(storeId, mockFile)).rejects.toThrow(
        new BadRequestException('Store not found'),
      );
    });

    it('should throw BadRequestException when maximum banners reached', async () => {
      prismaService.store.findUnique.mockResolvedValue({
        id: storeId,
        bannersUrl: Array(5).fill('https://storage.com/banner.png'),
      });

      await expect(service.addBanner(storeId, mockFile)).rejects.toThrow(
        new BadRequestException('Maximum of 5 banners allowed'),
      );
    });
  });

  describe('removeBanner', () => {
    const storeId = 'store-123';
    const bannerIndex = 1;

    it('should remove a banner successfully', async () => {
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      prismaService.store.findUnique.mockResolvedValue({
        id: storeId,
        bannersUrl: ['https://storage.com/banner1.png', 'https://storage.com/banner2.png', 'https://storage.com/banner3.png'],
      });

      const updatedStore = {
        ...mockStore,
        bannersUrl: ['https://storage.com/banner1.png', 'https://storage.com/banner3.png'],
      };

      prismaService.store.update.mockResolvedValue(updatedStore);

      const result = await service.removeBanner(storeId, bannerIndex);

      expect(prismaService.store.findUnique).toHaveBeenCalledWith({
        where: { id: storeId },
        select: { id: true, bannersUrl: true },
      });

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('https://storage.com/banner2.png');
      expect(prismaService.store.update).toHaveBeenCalledWith({
        where: { id: storeId },
        data: {
          bannersUrl: ['https://storage.com/banner1.png', 'https://storage.com/banner3.png'],
        },
        select: mockStoreSelect,
      });

      expect(result.success).toBe(true);
      expect(result.store).toEqual(updatedStore);
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.removeBanner(storeId, bannerIndex)).rejects.toThrow(
        new BadRequestException('Store not found'),
      );
    });

    it('should throw BadRequestException when invalid banner index', async () => {
      prismaService.store.findUnique.mockResolvedValue({
        id: storeId,
        bannersUrl: ['https://storage.com/banner1.png'],
      });

      await expect(service.removeBanner(storeId, 5)).rejects.toThrow(
        new BadRequestException('Invalid banner index'),
      );
    });
  });

  describe('addMultipleBanners', () => {
    const storeId = 'store-123';
    const mockFiles = [
      {
        fieldname: 'files',
        originalname: 'banner1.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('fake-image-data-1'),
        size: 1024,
      },
      {
        fieldname: 'files',
        originalname: 'banner2.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('fake-image-data-2'),
        size: 1024,
      },
    ];

    it('should add multiple banners successfully', async () => {
      mockStorageService.uploadFile
        .mockResolvedValueOnce('https://storage.com/banner1.png')
        .mockResolvedValueOnce('https://storage.com/banner2.png');

      prismaService.store.findUnique.mockResolvedValue({
        id: storeId,
        bannersUrl: ['https://storage.com/existing-banner.png'],
      });

      const updatedStore = {
        ...mockStore,
        bannersUrl: [
          'https://storage.com/existing-banner.png',
          'https://storage.com/banner1.png',
          'https://storage.com/banner2.png',
        ],
      };

      prismaService.store.update.mockResolvedValue(updatedStore);

      const result = await service.addMultipleBanners(storeId, mockFiles);

      expect(prismaService.store.findUnique).toHaveBeenCalledWith({
        where: { id: storeId },
        select: { id: true, bannersUrl: true },
      });

      expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(2);
      expect(prismaService.store.update).toHaveBeenCalledWith({
        where: { id: storeId },
        data: {
          bannersUrl: [
            'https://storage.com/existing-banner.png',
            'https://storage.com/banner1.png',
            'https://storage.com/banner2.png',
          ],
        },
        select: mockStoreSelect,
      });

      expect(result.success).toBe(true);
      expect(result.store).toEqual(updatedStore);
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.addMultipleBanners(storeId, mockFiles)).rejects.toThrow(
        new BadRequestException('Store not found'),
      );
    });
  });

  describe('removeMultipleBanners', () => {
    const storeId = 'store-123';
    const indices = [0, 2];

    it('should remove multiple banners successfully', async () => {
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      prismaService.store.findUnique.mockResolvedValue({
        id: storeId,
        bannersUrl: [
          'https://storage.com/banner1.png',
          'https://storage.com/banner2.png',
          'https://storage.com/banner3.png',
        ],
      });

      const updatedStore = {
        ...mockStore,
        bannersUrl: ['https://storage.com/banner2.png'],
      };

      prismaService.store.update.mockResolvedValue(updatedStore);

      const result = await service.removeMultipleBanners(storeId, indices);

      expect(prismaService.store.findUnique).toHaveBeenCalledWith({
        where: { id: storeId },
        select: { id: true, bannersUrl: true },
      });

      expect(mockStorageService.deleteFile).toHaveBeenCalledTimes(2);
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('https://storage.com/banner1.png');
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('https://storage.com/banner3.png');

      expect(prismaService.store.update).toHaveBeenCalledWith({
        where: { id: storeId },
        data: {
          bannersUrl: ['https://storage.com/banner2.png'],
        },
        select: mockStoreSelect,
      });

      expect(result.success).toBe(true);
      expect(result.store).toEqual(updatedStore);
      expect(result.removedCount).toBe(2);
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.removeMultipleBanners(storeId, indices)).rejects.toThrow(
        new BadRequestException('Store not found'),
      );
    });

    it('should throw BadRequestException when no valid indices provided', async () => {
      prismaService.store.findUnique.mockResolvedValue({
        id: storeId,
        bannersUrl: ['https://storage.com/banner1.png'],
      });

      await expect(service.removeMultipleBanners(storeId, [5, 10])).rejects.toThrow(
        new BadRequestException('No valid indices provided'),
      );
    });
  });
});
