import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateStoreDto } from '../dto/create-store.dto';
import { UpdateStoreDto } from '../dto/update-store.dto';
import { StoreController } from '../store.controller';
import { StoreService } from '../store.service';

describe('StoreController', () => {
  let controller: StoreController;
  let storeService: any;

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
    bannersUrl: [
      'https://example.com/banner1.png',
      'https://example.com/banner2.png',
    ],
    secondaryBannerUrl: 'https://example.com/offer-banner.png',
  };

  const mockUser = {
    id: 'user-123',
    storeId: 'store-123',
    email: 'user@example.com',
    name: 'Test User',
    phone: '+5511999999999',
    password: 'hashedPassword',
    documentType: 'cpf' as const,
    documentValue: '12345678901',
    role: 'RESELLER_ADMIN_4MIGA_USER' as const,
    isEmailConfirmed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockStoreService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addBanner: jest.fn(),
      removeBanner: jest.fn(),
      addMultipleBanners: jest.fn(),
      removeMultipleBanners: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [
        {
          provide: StoreService,
          useValue: mockStoreService,
        },
      ],
    }).compile();

    controller = module.get<StoreController>(StoreController);
    storeService = module.get(StoreService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all stores successfully', async () => {
      const stores = [mockStore];
      storeService.findAll.mockResolvedValue(stores);

      const result = await controller.findAll();

      expect(storeService.findAll).toHaveBeenCalled();
      expect(result).toEqual(stores);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch stores');
      storeService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(
        'Failed to fetch stores',
      );
      expect(storeService.findAll).toHaveBeenCalled();
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
      storeService.create.mockResolvedValue(mockStore);

      const result = await controller.create(createStoreDto);

      expect(storeService.create).toHaveBeenCalledWith(createStoreDto);
      expect(result).toEqual(mockStore);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create store');
      storeService.create.mockRejectedValue(error);

      await expect(controller.create(createStoreDto)).rejects.toThrow(
        'Failed to create store',
      );
      expect(storeService.create).toHaveBeenCalledWith(createStoreDto);
    });
  });

  describe('findOne', () => {
    const storeId = 'store-123';

    it('should return a store successfully', async () => {
      storeService.findOne.mockResolvedValue(mockStore);

      const result = await controller.findOne(storeId);

      expect(storeService.findOne).toHaveBeenCalledWith(storeId);
      expect(result).toEqual(mockStore);
    });

    it('should handle find one errors', async () => {
      const error = new Error('Store not found');
      storeService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(storeId)).rejects.toThrow(
        'Store not found',
      );
      expect(storeService.findOne).toHaveBeenCalledWith(storeId);
    });
  });

  describe('update', () => {
    const storeId = 'store-123';
    const updateStoreDto: UpdateStoreDto = {
      name: 'Loja Atualizada',
      email: 'atualizada@loja.com',
    };

    it('should update a store successfully', async () => {
      const updatedStore = { ...mockStore, ...updateStoreDto };
      storeService.update.mockResolvedValue(updatedStore);

      const result = await controller.update(mockUser, updateStoreDto);

      expect(storeService.update).toHaveBeenCalledWith(storeId, updateStoreDto);
      expect(result).toEqual(updatedStore);
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update store');
      storeService.update.mockRejectedValue(error);

      await expect(controller.update(mockUser, updateStoreDto)).rejects.toThrow(
        'Failed to update store',
      );
      expect(storeService.update).toHaveBeenCalledWith(storeId, updateStoreDto);
    });
  });

  describe('remove', () => {
    const storeId = 'store-123';

    it('should remove a store successfully', async () => {
      storeService.remove.mockResolvedValue(mockStore);

      const result = await controller.remove(storeId);

      expect(storeService.remove).toHaveBeenCalledWith(storeId);
      expect(result).toEqual(mockStore);
    });

    it('should handle remove errors', async () => {
      const error = new Error('Failed to remove store');
      storeService.remove.mockRejectedValue(error);

      await expect(controller.remove(storeId)).rejects.toThrow(
        'Failed to remove store',
      );
      expect(storeService.remove).toHaveBeenCalledWith(storeId);
    });
  });

  describe('uploadBanner', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'banner.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('fake-image-data'),
      size: 1024,
    };

    const mockResult = {
      success: true,
      store: mockStore,
    };

    it('should upload a banner successfully', async () => {
      storeService.addBanner.mockResolvedValue(mockResult);

      const result = await controller.uploadBanner(mockFile, mockUser);

      expect(storeService.addBanner).toHaveBeenCalledWith(
        mockUser.storeId,
        mockFile,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(
        controller.uploadBanner(undefined as any, mockUser),
      ).rejects.toThrow('No file provided');
    });
  });

  describe('deleteBanner', () => {
    const bannerIndex = '1';
    const mockUser = {
      id: 'user-123',
      storeId: 'store-123',
      email: 'user@example.com',
      name: 'Test User',
      phone: '+5511999999999',
      password: 'hashedPassword',
      documentType: 'cpf' as const,
      documentValue: '12345678901',
      role: 'RESELLER_ADMIN_4MIGA_USER' as const,
      isEmailConfirmed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockResult = {
      success: true,
      store: mockStore,
    };

    it('should delete a banner successfully', async () => {
      storeService.removeBanner.mockResolvedValue(mockResult);

      const result = await controller.deleteBanner(bannerIndex, mockUser);

      expect(storeService.removeBanner).toHaveBeenCalledWith(
        mockUser.storeId,
        1,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException when invalid banner index', async () => {
      await expect(
        controller.deleteBanner('invalid', mockUser),
      ).rejects.toThrow('Invalid banner index');
    });

    it('should throw BadRequestException when negative banner index', async () => {
      await expect(controller.deleteBanner('-1', mockUser)).rejects.toThrow(
        'Invalid banner index',
      );
    });
  });

  describe('uploadBannersBatch', () => {
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

    const mockUser = {
      id: 'user-123',
      storeId: 'store-123',
      email: 'user@example.com',
      name: 'Test User',
      phone: '+5511999999999',
      password: 'hashedPassword',
      documentType: 'cpf' as const,
      documentValue: '12345678901',
      role: 'RESELLER_ADMIN_4MIGA_USER' as const,
      isEmailConfirmed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockResult = {
      success: true,
      store: mockStore,
    };

    it('should upload multiple banners successfully', async () => {
      storeService.addMultipleBanners.mockResolvedValue(mockResult);

      const result = await controller.uploadBannersBatch(mockFiles, mockUser);

      expect(storeService.addMultipleBanners).toHaveBeenCalledWith(
        mockUser.storeId,
        mockFiles,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException when no files provided', async () => {
      await expect(controller.uploadBannersBatch([], mockUser)).rejects.toThrow(
        'No files provided',
      );
    });

    it('should throw BadRequestException when null files provided', async () => {
      await expect(
        controller.uploadBannersBatch(undefined as any, mockUser),
      ).rejects.toThrow('No files provided');
    });
  });

  describe('deleteBannersBatch', () => {
    const mockUser = {
      id: 'user-123',
      storeId: 'store-123',
      email: 'user@example.com',
      name: 'Test User',
      phone: '+5511999999999',
      password: 'hashedPassword',
      documentType: 'cpf' as const,
      documentValue: '12345678901',
      role: 'RESELLER_ADMIN_4MIGA_USER' as const,
      isEmailConfirmed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const removeBannersDto = {
      indices: [0, 2],
    };

    const mockResult = {
      success: true,
      store: mockStore,
      removedCount: 2,
    };

    it('should delete multiple banners successfully', async () => {
      storeService.removeMultipleBanners.mockResolvedValue(mockResult);

      const result = await controller.deleteBannersBatch(
        removeBannersDto,
        mockUser,
      );

      expect(storeService.removeMultipleBanners).toHaveBeenCalledWith(
        mockUser.storeId,
        removeBannersDto.indices,
      );
      expect(result).toEqual(mockResult);
    });
  });

});
