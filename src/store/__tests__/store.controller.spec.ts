import { Test, TestingModule } from '@nestjs/testing';
import { StoreController } from '../store.controller';
import { StoreService } from '../store.service';
import { CreateStoreDto } from '../dto/create-store.dto';
import { UpdateStoreDto } from '../dto/update-store.dto';

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
    bannersUrl: ['https://example.com/banner1.png', 'https://example.com/banner2.png'],
    onSaleUrlImg: 'https://example.com/on-sale.png',
  };

  beforeEach(async () => {
    const mockStoreService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
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

      await expect(controller.findAll()).rejects.toThrow('Failed to fetch stores');
      expect(storeService.findAll).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createStoreDto: CreateStoreDto = {
      name: 'Nova Loja',
      email: 'nova@loja.com',
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

      await expect(controller.create(createStoreDto)).rejects.toThrow('Failed to create store');
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

      await expect(controller.findOne(storeId)).rejects.toThrow('Store not found');
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

      const result = await controller.update(storeId, updateStoreDto);

      expect(storeService.update).toHaveBeenCalledWith(storeId, updateStoreDto);
      expect(result).toEqual(updatedStore);
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update store');
      storeService.update.mockRejectedValue(error);

      await expect(controller.update(storeId, updateStoreDto)).rejects.toThrow('Failed to update store');
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

      await expect(controller.remove(storeId)).rejects.toThrow('Failed to remove store');
      expect(storeService.remove).toHaveBeenCalledWith(storeId);
    });
  });
});
