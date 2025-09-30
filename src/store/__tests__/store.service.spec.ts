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

    const mockStorageService = {
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
});
