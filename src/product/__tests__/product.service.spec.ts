import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProductService } from '../product.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';
import { StorageService } from '../../storage/storage.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

// Mock validation utility
jest.mock('../../utils/validation.util', () => ({
  validateRequiredFields: jest.fn(),
}));

describe('ProductService', () => {
  let service: ProductService;
  let prismaService: any;
  let storageService: any;

  const dec = (n: number) => ({ toNumber: () => n } as any);

  const mockProduct = {
    id: 'product-123',
    name: 'Mobile Recharge',
    description: 'Product for recharging credits on prepaid mobile phones.',
    instructions: 'Enter the phone number and the desired recharge amount.',
    imgBannerUrl: 'https://example.com/banner.png',
    imgCardUrl: 'https://example.com/card.png',
  };

  const mockPackage = {
    id: 'package-123',
    name: 'R$ 10 Credit',
    amountCredits: 10,
    imgCardUrl: 'https://example.com/package-card.png',
    isOffer: false,
    basePrice: dec(10.0),
    productId: 'product-123',
    storeId: 'store-123',
    isActive: true,
    paymentMethods: [
      {
        id: 'payment-123',
        name: 'Credit Card',
        price: dec(10.0),
        packageId: 'package-123',
      },
    ],
  };

  const mockProductSelect = {
    id: true,
    name: true,
    description: true,
    instructions: true,
    imgBannerUrl: true,
    imgCardUrl: true,
    packages: false,
    createdAt: false,
    updatedAt: false,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      package: {
        findMany: jest.fn(),
      },
      storeProductSettings: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      store: {
        findUnique: jest.fn(),
      },
    };

    const mockWebhookService = {
      notifyProductUpdate: jest.fn(),
      notifyPackageUpdate: jest.fn(),
      notifyStoreUpdate: jest.fn(),
    };

    const mockStorageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      getBucketUrl: jest.fn(),
    } as Partial<StorageService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WebhookService,
          useValue: mockWebhookService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prismaService = module.get(PrismaService);
    storageService = module.get(StorageService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const storeId = 'store-123';

    it('should return all products with packages successfully', async () => {
      const products = [mockProduct];
      const packages = [mockPackage];
      const mockCustomization = null; // No customization for this test

      prismaService.product.findMany.mockResolvedValue(products);
      prismaService.package.findMany.mockResolvedValue(packages);
      prismaService.storeProductSettings.findFirst.mockResolvedValue(
        mockCustomization,
      );

      const result = await service.findAll(storeId);

      expect(prismaService.product.findMany).toHaveBeenCalledWith({
        select: mockProductSelect,
      });

      expect(prismaService.package.findMany).toHaveBeenCalledWith({
        where: {
          productId: mockProduct.id,
          storeId: storeId,
        },
        select: {
          id: true,
          name: true,
          amountCredits: true,
          imgCardUrl: true,
          isOffer: true,
          basePrice: true,
          productId: true,
          storeId: true,
          isActive: true,
          createdAt: false,
          updatedAt: false,
          paymentMethods: {
            select: {
              id: true,
              name: true,
              price: true,
              packageId: true,
              createdAt: false,
              updatedAt: false,
            },
          },
        },
        orderBy: { amountCredits: 'asc' },
      });

      expect(prismaService.storeProductSettings.findFirst).toHaveBeenCalledWith(
        {
          where: {
            productId: mockProduct.id,
            storeId: storeId,
          },
        },
      );

      expect(result).toEqual([
        {
          ...mockProduct,
          packages: [
            {
              ...mockPackage,
              basePrice: 10,
              paymentMethods: mockPackage.paymentMethods.map(pm => ({
                ...pm,
                price: 10,
              })),
            },
          ],
          storeCustomization: null,
        },
      ]);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.product.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAll(storeId)).rejects.toThrow(
        new BadRequestException('Failed to fetch products'),
      );
    });
  });

  describe('findAllForAdmin', () => {
    it('should return all products for admin successfully', async () => {
      const products = [mockProduct];
      prismaService.product.findMany.mockResolvedValue(products);

      const result = await service.findAllForAdmin();

      expect(prismaService.product.findMany).toHaveBeenCalledWith({
        select: mockProductSelect,
      });
      expect(result).toEqual(products);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.product.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAllForAdmin()).rejects.toThrow(
        new BadRequestException('Failed to fetch products'),
      );
    });
  });

  describe('findOne', () => {
    const productId = 'product-123';
    const storeId = 'store-123';

    it('should return a product with packages successfully', async () => {
      const packages = [mockPackage];
      const mockCustomization = null; // No customization for this test

      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.package.findMany.mockResolvedValue(packages);
      prismaService.storeProductSettings.findFirst.mockResolvedValue(
        mockCustomization,
      );

      const result = await service.findOne(productId, storeId);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
        select: mockProductSelect,
      });

      expect(prismaService.package.findMany).toHaveBeenCalledWith({
        where: {
          productId: productId,
          storeId: storeId,
        },
        include: {
          paymentMethods: {
            select: {
              id: true,
              name: true,
              price: true,
              createdAt: false,
              updatedAt: false,
            },
          },
        },
        orderBy: { amountCredits: 'asc' },
      });

      expect(prismaService.storeProductSettings.findFirst).toHaveBeenCalledWith(
        {
          where: {
            productId: productId,
            storeId: storeId,
          },
        },
      );

      expect(result).toEqual({
        ...mockProduct,
        packages: [
          {
            ...mockPackage,
            basePrice: 10,
            paymentMethods: mockPackage.paymentMethods.map(pm => ({
              ...pm,
              price: 10,
            })),
          },
        ],
        storeCustomization: null,
      });
    });

    it('should throw BadRequestException when product not found', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne(productId, storeId)).rejects.toThrow(
        new BadRequestException('Failed to fetch product'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.product.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOne(productId, storeId)).rejects.toThrow(
        new BadRequestException('Failed to fetch product'),
      );
    });
  });

  describe('findBigoProduct', () => {
    const storeId = 'store-123';
    const mockBigoProduct = {
      id: 'bigo-product-123',
      name: 'Bigo Live',
      description: 'Recharge diamonds for Bigo Live',
      instructions: 'Enter your Bigo Live ID',
      imgBannerUrl: 'https://example.com/bigo-banner.png',
      imgCardUrl: 'https://example.com/bigo-card.png',
    };

    it('should return Bigo product with packages successfully', async () => {
      const packages = [mockPackage];
      const mockCustomization = null;

      prismaService.product.findFirst.mockResolvedValue(mockBigoProduct);
      prismaService.package.findMany.mockResolvedValue(packages);
      prismaService.storeProductSettings.findFirst.mockResolvedValue(
        mockCustomization,
      );

      const result = await service.findBigoProduct(storeId);

      expect(prismaService.product.findFirst).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'bigo',
            mode: 'insensitive',
          },
        },
        select: mockProductSelect,
      });

      expect(prismaService.package.findMany).toHaveBeenCalledWith({
        where: {
          productId: mockBigoProduct.id,
          storeId: storeId,
        },
        include: {
          paymentMethods: {
            select: {
              id: true,
              name: true,
              price: true,
              createdAt: false,
              updatedAt: false,
            },
          },
        },
        orderBy: { amountCredits: 'asc' },
      });

      expect(prismaService.storeProductSettings.findFirst).toHaveBeenCalledWith(
        {
          where: {
            productId: mockBigoProduct.id,
            storeId: storeId,
          },
        },
      );

      expect(result).toEqual({
        ...mockBigoProduct,
        packages: [
          {
            ...mockPackage,
            basePrice: 10,
            paymentMethods: mockPackage.paymentMethods.map(pm => ({
              ...pm,
              price: 10,
            })),
          },
        ],
        storeCustomization: null,
      });
    });

    it('should throw BadRequestException when Bigo product not found', async () => {
      prismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.findBigoProduct(storeId)).rejects.toThrow(
        new BadRequestException('Bigo product not found'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.product.findFirst.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findBigoProduct(storeId)).rejects.toThrow(
        new BadRequestException('Failed to fetch Bigo product'),
      );
    });

    it('should find product with different case variations', async () => {
      const packages = [mockPackage];
      const mockBigoUpperCase = { ...mockBigoProduct, name: 'BIGO LIVE' };

      prismaService.product.findFirst.mockResolvedValue(mockBigoUpperCase);
      prismaService.package.findMany.mockResolvedValue(packages);
      prismaService.storeProductSettings.findFirst.mockResolvedValue(null);

      const result = await service.findBigoProduct(storeId);

      expect(prismaService.product.findFirst).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'bigo',
            mode: 'insensitive',
          },
        },
        select: mockProductSelect,
      });

      expect(result.name).toBe('BIGO LIVE');
    });
  });

  describe('create', () => {
    const createProductDto: CreateProductDto = {
      name: 'New Product',
      description: 'A new product description',
      instructions: 'Instructions for the new product',
      imgBannerUrl: 'https://example.com/new-banner.png',
      imgCardUrl: 'https://example.com/new-card.png',
    };

    it('should create a product successfully', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(validateRequiredFields).toHaveBeenCalledWith(createProductDto, [
        'name',
        'description',
        'instructions',
        'imgBannerUrl',
        'imgCardUrl',
      ]);

      expect(prismaService.product.create).toHaveBeenCalledWith({
        data: createProductDto,
      });

      expect(result).toEqual(mockProduct);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.product.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createProductDto)).rejects.toThrow(
        new BadRequestException('Failed to create product'),
      );
    });
  });

  describe('update', () => {
    const productId = 'product-123';
    const updateProductDto: UpdateProductDto = {
      name: 'Updated Product',
      description: 'Updated description',
    };

    it('should update a product successfully', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.product.update.mockResolvedValue({
        ...mockProduct,
        ...updateProductDto,
      });

      const result = await service.update(productId, updateProductDto);

      expect(validateRequiredFields).toHaveBeenCalledWith(updateProductDto, [
        'name',
        'description',
      ]);

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: updateProductDto,
      });

      expect(result).toEqual({ ...mockProduct, ...updateProductDto });
    });

    it('should throw BadRequestException when product not found', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.update(productId, updateProductDto)).rejects.toThrow(
        new BadRequestException('Failed to update product'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.product.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.update(productId, updateProductDto)).rejects.toThrow(
        new BadRequestException('Failed to update product'),
      );
    });
  });

  describe('remove', () => {
    const productId = 'product-123';

    it('should remove a product successfully', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.product.delete.mockResolvedValue(mockProduct);

      const result = await service.remove(productId);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
        select: mockProductSelect,
      });

      expect(prismaService.product.delete).toHaveBeenCalledWith({
        where: { id: productId },
      });

      expect(result).toEqual({ message: 'Product deleted successfully' });
    });

    it('should throw BadRequestException when product not found', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove(productId)).rejects.toThrow(
        new BadRequestException('Failed to remove product'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.product.delete.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.remove(productId)).rejects.toThrow(
        new BadRequestException('Failed to remove product'),
      );
    });
  });

  // StoreProductSettings tests
  describe('StoreProductSettings CRUD', () => {
    const mockStoreProductSettings = {
      id: 'customization-123',
      storeId: 'store-123',
      productId: 'product-123',
      description: 'Custom description',
      instructions: 'Custom instructions',
      imgBannerUrl: 'https://custom-banner.com',
      imgCardUrl: 'https://custom-card.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createStoreProductSettingsDto = {
      storeId: 'store-123',
      productId: 'product-123',
      description: 'Custom description',
      instructions: 'Custom instructions',
      imgBannerUrl: 'https://custom-banner.com',
      imgCardUrl: 'https://custom-card.com',
    };

    describe('createStoreProductSettings', () => {
      it('should create store product settings successfully', async () => {
        const {
          validateRequiredFields,
        } = require('../../utils/validation.util');
        validateRequiredFields.mockImplementation(() => {});

        prismaService.store.findUnique.mockResolvedValue({ id: 'store-123' });
        prismaService.product.findUnique.mockResolvedValue({
          id: 'product-123',
        });
        prismaService.storeProductSettings.findFirst.mockResolvedValue(null);
        prismaService.storeProductSettings.create.mockResolvedValue(
          mockStoreProductSettings,
        );

        const result = await service.createStoreProductSettings(
          createStoreProductSettingsDto,
        );

        expect(validateRequiredFields).toHaveBeenCalledWith(
          createStoreProductSettingsDto,
          ['storeId', 'productId'],
        );
        expect(prismaService.store.findUnique).toHaveBeenCalledWith({
          where: { id: 'store-123' },
        });
        expect(prismaService.product.findUnique).toHaveBeenCalledWith({
          where: { id: 'product-123' },
        });
        expect(prismaService.storeProductSettings.create).toHaveBeenCalledWith({
          data: createStoreProductSettingsDto,
        });
        expect(result).toEqual(mockStoreProductSettings);
      });

      it('should throw BadRequestException when store not found', async () => {
        const {
          validateRequiredFields,
        } = require('../../utils/validation.util');
        validateRequiredFields.mockImplementation(() => {});

        prismaService.store.findUnique.mockResolvedValue(null);

        await expect(
          service.createStoreProductSettings(createStoreProductSettingsDto),
        ).rejects.toThrow(new BadRequestException('Store not found'));
      });

      it('should throw BadRequestException when product not found', async () => {
        const {
          validateRequiredFields,
        } = require('../../utils/validation.util');
        validateRequiredFields.mockImplementation(() => {});

        prismaService.store.findUnique.mockResolvedValue({ id: 'store-123' });
        prismaService.product.findUnique.mockResolvedValue(null);

        await expect(
          service.createStoreProductSettings(createStoreProductSettingsDto),
        ).rejects.toThrow(new BadRequestException('Product not found'));
      });

      it('should throw BadRequestException when customization already exists', async () => {
        const {
          validateRequiredFields,
        } = require('../../utils/validation.util');
        validateRequiredFields.mockImplementation(() => {});

        prismaService.store.findUnique.mockResolvedValue({ id: 'store-123' });
        prismaService.product.findUnique.mockResolvedValue({
          id: 'product-123',
        });
        prismaService.storeProductSettings.findFirst.mockResolvedValue(
          mockStoreProductSettings,
        );

        await expect(
          service.createStoreProductSettings(createStoreProductSettingsDto),
        ).rejects.toThrow(
          new BadRequestException(
            'Product customization already exists for this store',
          ),
        );
      });
    });

    describe('findAllStoreProductSettings', () => {
      it('should return all store product settings for a store', async () => {
        const settings = [mockStoreProductSettings];
        prismaService.storeProductSettings.findMany.mockResolvedValue(settings);

        const result = await service.findAllStoreProductSettings('store-123');

        expect(
          prismaService.storeProductSettings.findMany,
        ).toHaveBeenCalledWith({
          where: { storeId: 'store-123' },
          orderBy: { createdAt: 'desc' },
        });
        expect(result).toEqual(settings);
      });

      it('should throw BadRequestException when storeId is not provided', async () => {
        await expect(service.findAllStoreProductSettings('')).rejects.toThrow(
          new BadRequestException('Store ID is required'),
        );
      });

      it('should throw BadRequestException when storeId is null', async () => {
        await expect(service.findAllStoreProductSettings(null as any)).rejects.toThrow(
          new BadRequestException('Store ID is required'),
        );
      });
    });

    describe('findOneStoreProductSettings', () => {
      it('should return store product settings by id', async () => {
        prismaService.storeProductSettings.findFirst.mockResolvedValue(
          mockStoreProductSettings,
        );

        const result =
          await service.findOneStoreProductSettings('customization-123', 'store-123');

        expect(
          prismaService.storeProductSettings.findFirst,
        ).toHaveBeenCalledWith({
          where: {
            id: 'customization-123',
            storeId: 'store-123'
          },
        });
        expect(result).toEqual(mockStoreProductSettings);
      });

      it('should throw BadRequestException when customization not found', async () => {
        prismaService.storeProductSettings.findFirst.mockResolvedValue(null);

        await expect(
          service.findOneStoreProductSettings('customization-123', 'store-123'),
        ).rejects.toThrow(
          new BadRequestException('Product customization not found'),
        );
      });
    });

    describe('updateStoreProductSettings', () => {
      const storeId = 'store-123';
      const productId = 'product-123';
      const updateDto = { description: 'Updated description' };

      it('should update existing store product settings successfully', async () => {
        const {
          validateRequiredFields,
        } = require('../../utils/validation.util');
        validateRequiredFields.mockImplementation(() => {});

        prismaService.store.findUnique.mockResolvedValue({ id: storeId });
        prismaService.product.findUnique.mockResolvedValue({ id: productId });
        prismaService.storeProductSettings.findFirst.mockResolvedValue(
          mockStoreProductSettings,
        );
        prismaService.storeProductSettings.update.mockResolvedValue({
          ...mockStoreProductSettings,
          ...updateDto,
        });

        const result = await service.updateStoreProductSettings(
          storeId,
          productId,
          updateDto,
        );

        expect(validateRequiredFields).toHaveBeenCalledWith(updateDto, [
          'description',
        ]);
        expect(prismaService.store.findUnique).toHaveBeenCalledWith({
          where: { id: storeId },
        });
        expect(prismaService.product.findUnique).toHaveBeenCalledWith({
          where: { id: productId },
        });
        expect(prismaService.storeProductSettings.findFirst).toHaveBeenCalledWith({
          where: { storeId, productId },
        });
        expect(prismaService.storeProductSettings.update).toHaveBeenCalledWith({
          where: { id: mockStoreProductSettings.id },
          data: updateDto,
        });
        expect(result).toEqual({ ...mockStoreProductSettings, ...updateDto });
      });

      it('should create new store product settings when they do not exist', async () => {
        const {
          validateRequiredFields,
        } = require('../../utils/validation.util');
        validateRequiredFields.mockImplementation(() => {});

        prismaService.store.findUnique.mockResolvedValue({ id: storeId });
        prismaService.product.findUnique.mockResolvedValue({ id: productId });
        prismaService.storeProductSettings.findFirst.mockResolvedValue(null);
        prismaService.storeProductSettings.create.mockResolvedValue({
          ...mockStoreProductSettings,
          ...updateDto,
        });

        const result = await service.updateStoreProductSettings(
          storeId,
          productId,
          updateDto,
        );

        expect(prismaService.storeProductSettings.create).toHaveBeenCalledWith({
          data: {
            storeId,
            productId,
            ...updateDto,
          },
        });
        expect(result).toEqual({ ...mockStoreProductSettings, ...updateDto });
      });

      it('should throw BadRequestException when store not found', async () => {
        const {
          validateRequiredFields,
        } = require('../../utils/validation.util');
        validateRequiredFields.mockImplementation(() => {});

        prismaService.store.findUnique.mockResolvedValue(null);

        await expect(
          service.updateStoreProductSettings(storeId, productId, updateDto),
        ).rejects.toThrow(new BadRequestException('Store not found'));
      });

      it('should throw BadRequestException when product not found', async () => {
        const {
          validateRequiredFields,
        } = require('../../utils/validation.util');
        validateRequiredFields.mockImplementation(() => {});

        prismaService.store.findUnique.mockResolvedValue({ id: storeId });
        prismaService.product.findUnique.mockResolvedValue(null);

        await expect(
          service.updateStoreProductSettings(storeId, productId, updateDto),
        ).rejects.toThrow(new BadRequestException('Product not found'));
      });
    });

    describe('removeStoreProductSettings', () => {
      it('should remove store product settings successfully', async () => {
        prismaService.storeProductSettings.findUnique.mockResolvedValue(
          mockStoreProductSettings,
        );
        prismaService.storeProductSettings.delete.mockResolvedValue(
          mockStoreProductSettings,
        );

        const result =
          await service.removeStoreProductSettings('customization-123');

        expect(
          prismaService.storeProductSettings.findUnique,
        ).toHaveBeenCalledWith({
          where: { id: 'customization-123' },
        });
        expect(prismaService.storeProductSettings.delete).toHaveBeenCalledWith({
          where: { id: 'customization-123' },
        });
        expect(result).toEqual({
          message: 'Product customization deleted successfully',
        });
      });

      it('should throw BadRequestException when customization not found', async () => {
        prismaService.storeProductSettings.findUnique.mockResolvedValue(null);

        await expect(
          service.removeStoreProductSettings('customization-123'),
        ).rejects.toThrow(
          new BadRequestException('Product customization not found'),
        );
      });
    });
  });

  describe('updateStoreProductImage', () => {
    const storeId = 'store-123';
    const productId = 'product-123';
    const file: any = {
      fieldname: 'file',
      originalname: 'banner.JPG',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from([1, 2, 3]),
      size: 3,
    };

    const mockStore = { id: storeId, name: 'Test Store' };
    const mockProduct = { id: productId, name: 'Test Product' };
    const mockSettings = {
      id: 'settings-123',
      storeId,
      productId,
      imgBannerUrl: null,
      imgCardUrl: null,
    };

    it('should upload banner image successfully', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.storeProductSettings.findFirst.mockResolvedValue(mockSettings);
      const uploadedUrl = 'https://storage.googleapis.com/bucket/store/store-123/product/product-123/banner/banner.jpg';
      storageService.uploadFile.mockResolvedValue(uploadedUrl);
      const updatedSettings = { ...mockSettings, imgBannerUrl: uploadedUrl };
      prismaService.storeProductSettings.update.mockResolvedValue(updatedSettings);

      const result = await service.updateStoreProductImage(storeId, productId, file, 'banner');

      expect(prismaService.store.findUnique).toHaveBeenCalledWith({ where: { id: storeId } });
      expect(prismaService.product.findUnique).toHaveBeenCalledWith({ where: { id: productId } });
      expect(storageService.uploadFile).toHaveBeenCalledWith(
        file,
        `store/${storeId}/product/${productId}/banner`,
        'banner.jpg',
      );
      expect(prismaService.storeProductSettings.update).toHaveBeenCalledWith({
        where: { id: mockSettings.id },
        data: { imgBannerUrl: uploadedUrl },
      });
      expect(result.success).toBe(true);
      expect(result.fileUrl).toBe(uploadedUrl);
    });

    it('should upload card image successfully', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.storeProductSettings.findFirst.mockResolvedValue(mockSettings);
      const uploadedUrl = 'https://storage.googleapis.com/bucket/store/store-123/product/product-123/card/card.png';
      storageService.uploadFile.mockResolvedValue(uploadedUrl);
      const updatedSettings = { ...mockSettings, imgCardUrl: uploadedUrl };
      prismaService.storeProductSettings.update.mockResolvedValue(updatedSettings);

      const result = await service.updateStoreProductImage(storeId, productId, file, 'card');

      expect(storageService.uploadFile).toHaveBeenCalledWith(
        file,
        `store/${storeId}/product/${productId}/card`,
        'card.jpg',
      );
      expect(prismaService.storeProductSettings.update).toHaveBeenCalledWith({
        where: { id: mockSettings.id },
        data: { imgCardUrl: uploadedUrl },
      });
      expect(result.success).toBe(true);
    });

    it('should create settings if they do not exist', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.storeProductSettings.findFirst.mockResolvedValue(null);
      prismaService.storeProductSettings.create.mockResolvedValue(mockSettings);
      storageService.uploadFile.mockResolvedValue('https://example.com/banner.jpg');
      prismaService.storeProductSettings.update.mockResolvedValue(mockSettings);

      await service.updateStoreProductImage(storeId, productId, file, 'banner');

      expect(prismaService.storeProductSettings.create).toHaveBeenCalledWith({
        data: { storeId, productId },
      });
    });

    it('should throw BadRequestException when file is missing', async () => {
      await expect(service.updateStoreProductImage(storeId, productId, null as any, 'banner'))
        .rejects.toThrow('File is required');
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.updateStoreProductImage(storeId, productId, file, 'banner'))
        .rejects.toThrow('Store not found');
    });

    it('should throw BadRequestException when product not found', async () => {
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.updateStoreProductImage(storeId, productId, file, 'banner'))
        .rejects.toThrow('Product not found');
    });

    it('should continue when deleting previous image fails', async () => {
      const settingsWithImage = { ...mockSettings, imgBannerUrl: 'https://old-image.jpg' };
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.storeProductSettings.findFirst.mockResolvedValue(settingsWithImage);
      storageService.deleteFile.mockRejectedValue(new Error('Cannot delete'));
      storageService.uploadFile.mockResolvedValue('https://new-image.jpg');
      prismaService.storeProductSettings.update.mockResolvedValue(settingsWithImage);

      const result = await service.updateStoreProductImage(storeId, productId, file, 'banner');

      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
