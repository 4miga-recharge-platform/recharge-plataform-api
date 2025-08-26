import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PackageService } from '../package.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';
import { CreatePackageDto } from '../dto/create-package.dto';
import { UpdatePackageDto } from '../dto/update-package.dto';

// Mock validation utility
jest.mock('../../utils/validation.util', () => ({
  validateRequiredFields: jest.fn(),
}));

describe('PackageService', () => {
  let service: PackageService;
  let prismaService: any;

  const mockPackage = {
    id: 'package-123',
    name: 'Premium Package',
    amountCredits: 100,
    imgCardUrl: 'https://example.com/package-card.png',
    isOffer: false,
    basePrice: 19.99,
    productId: 'product-123',
    storeId: 'store-123',
    paymentMethods: [
      {
        id: 'payment-123',
        name: 'pix',
        price: 19.99,
        packageId: 'package-123',
      },
    ],
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Mobile Recharge',
  };

  const mockStore = {
    id: 'store-123',
    name: 'Loja Exemplo',
  };

  const mockPackageSelect = {
    id: true,
    name: true,
    amountCredits: true,
    imgCardUrl: true,
    isOffer: true,
    basePrice: true,
    productId: true,
    storeId: true,
    paymentMethods: true,
    createdAt: false,
    updatedAt: false,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      package: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackageService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WebhookService,
          useValue: mockWebhookService,
        },
      ],
    }).compile();

    service = module.get<PackageService>(PackageService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const storeId = 'store-123';

    it('should return all packages for a store successfully', async () => {
      const packages = [mockPackage];
      prismaService.package.findMany.mockResolvedValue(packages);

      const result = await service.findAll(storeId);

      expect(prismaService.package.findMany).toHaveBeenCalledWith({
        where: { storeId },
        select: mockPackageSelect,
      });
      expect(result).toEqual(packages);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.package.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll(storeId)).rejects.toThrow(
        new BadRequestException('Failed to fetch packages'),
      );
    });
  });

  describe('findOne', () => {
    const packageId = 'package-123';

    it('should return a package successfully', async () => {
      prismaService.package.findUnique.mockResolvedValue(mockPackage);

      const result = await service.findOne(packageId);

      expect(prismaService.package.findUnique).toHaveBeenCalledWith({
        where: { id: packageId },
        select: mockPackageSelect,
      });
      expect(result).toEqual(mockPackage);
    });

    it('should throw BadRequestException when package not found', async () => {
      prismaService.package.findUnique.mockResolvedValue(null);

      await expect(service.findOne(packageId)).rejects.toThrow(
        new BadRequestException('Failed to fetch package'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.package.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(packageId)).rejects.toThrow(
        new BadRequestException('Failed to fetch package'),
      );
    });
  });

  describe('create', () => {
    const createPackageDto: CreatePackageDto = {
      name: 'New Package',
      amountCredits: 50,
      imgCardUrl: 'https://example.com/new-package-card.png',
      isOffer: true,
      basePrice: 15.99,
      productId: 'product-123',
      storeId: 'store-123',
      paymentMethods: [
        {
          name: 'pix' as const,
          price: 15.99,
        },
      ],
    };

    it('should create a package with payment methods successfully', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.package.create.mockResolvedValue(mockPackage);

      const result = await service.create(createPackageDto);

      expect(validateRequiredFields).toHaveBeenCalledWith(createPackageDto, [
        'name',
        'amountCredits',
        'imgCardUrl',
        'basePrice',
        'productId',
        'storeId',
      ]);

      expect(prismaService.package.create).toHaveBeenCalledWith({
        data: {
          name: createPackageDto.name,
          amountCredits: createPackageDto.amountCredits,
          imgCardUrl: createPackageDto.imgCardUrl,
          isOffer: createPackageDto.isOffer,
          basePrice: createPackageDto.basePrice,
          productId: createPackageDto.productId,
          storeId: createPackageDto.storeId,
          paymentMethods: {
            create: createPackageDto.paymentMethods?.map(pm => ({
              name: pm.name,
              price: pm.price,
            })) || [],
          },
        },
        select: mockPackageSelect,
      });

      expect(result).toEqual(mockPackage);
    });

    it('should create a package without payment methods successfully', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      const dtoWithoutPaymentMethods = { ...createPackageDto };
      delete dtoWithoutPaymentMethods.paymentMethods;

      prismaService.package.create.mockResolvedValue(mockPackage);

      const result = await service.create(dtoWithoutPaymentMethods);

      expect(prismaService.package.create).toHaveBeenCalledWith({
        data: {
          name: dtoWithoutPaymentMethods.name,
          amountCredits: dtoWithoutPaymentMethods.amountCredits,
          imgCardUrl: dtoWithoutPaymentMethods.imgCardUrl,
          isOffer: dtoWithoutPaymentMethods.isOffer,
          basePrice: dtoWithoutPaymentMethods.basePrice,
          productId: dtoWithoutPaymentMethods.productId,
          storeId: dtoWithoutPaymentMethods.storeId,
        },
        select: mockPackageSelect,
      });

      expect(result).toEqual(mockPackage);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.package.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createPackageDto)).rejects.toThrow(
        new BadRequestException('Failed to create package'),
      );
    });
  });

  describe('update', () => {
    const packageId = 'package-123';
    const updatePackageDto: UpdatePackageDto = {
      name: 'Updated Package',
      basePrice: 25.99,
      paymentMethods: [
        {
          name: 'mercado_pago' as const,
          price: 25.99,
        },
      ],
    };

    it('should update a package successfully', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.package.findUnique.mockResolvedValue(mockPackage);
      prismaService.package.update.mockResolvedValue({ ...mockPackage, ...updatePackageDto });

      const result = await service.update(packageId, updatePackageDto);

      expect(prismaService.package.findUnique).toHaveBeenCalledWith({
        where: { id: packageId },
        select: mockPackageSelect,
      });

      expect(validateRequiredFields).toHaveBeenCalledWith(updatePackageDto, ['name', 'basePrice', 'paymentMethods']);

      expect(prismaService.package.update).toHaveBeenCalledWith({
        where: { id: packageId },
        data: {
          name: updatePackageDto.name,
          basePrice: updatePackageDto.basePrice,
          paymentMethods: {
            deleteMany: {},
            create: updatePackageDto.paymentMethods?.map(pm => ({
              name: pm.name,
              price: pm.price,
            })) || [],
          },
        },
        select: mockPackageSelect,
      });

      expect(result).toEqual({ ...mockPackage, ...updatePackageDto });
    });

    it('should update a package with product validation successfully', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      const dtoWithProductId = { ...updatePackageDto, productId: 'new-product-123' };

      prismaService.package.findUnique.mockResolvedValue(mockPackage);
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.package.update.mockResolvedValue({ ...mockPackage, ...dtoWithProductId });

      const result = await service.update(packageId, dtoWithProductId);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: dtoWithProductId.productId },
      });

      expect(result).toEqual({ ...mockPackage, ...dtoWithProductId });
    });

    it('should update a package with store validation successfully', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      const dtoWithStoreId = { ...updatePackageDto, storeId: 'new-store-123' };

      prismaService.package.findUnique.mockResolvedValue(mockPackage);
      prismaService.store.findUnique.mockResolvedValue(mockStore);
      prismaService.package.update.mockResolvedValue({ ...mockPackage, ...dtoWithStoreId });

      const result = await service.update(packageId, dtoWithStoreId);

      expect(prismaService.store.findUnique).toHaveBeenCalledWith({
        where: { id: dtoWithStoreId.storeId },
      });

      expect(result).toEqual({ ...mockPackage, ...dtoWithStoreId });
    });

    it('should throw BadRequestException when package not found', async () => {
      prismaService.package.findUnique.mockResolvedValue(null);

      await expect(service.update(packageId, updatePackageDto)).rejects.toThrow(
        new BadRequestException('Failed to update package'),
      );
    });

    it('should throw BadRequestException when product not found', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      const dtoWithInvalidProductId = { ...updatePackageDto, productId: 'invalid-product-123' };

      prismaService.package.findUnique.mockResolvedValue(mockPackage);
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.update(packageId, dtoWithInvalidProductId)).rejects.toThrow(
        new BadRequestException('Failed to update package'),
      );
    });

    it('should throw BadRequestException when store not found', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      const dtoWithInvalidStoreId = { ...updatePackageDto, storeId: 'invalid-store-123' };

      prismaService.package.findUnique.mockResolvedValue(mockPackage);
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.update(packageId, dtoWithInvalidStoreId)).rejects.toThrow(
        new BadRequestException('Failed to update package'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.package.findUnique.mockResolvedValue(mockPackage);
      prismaService.package.update.mockRejectedValue(new Error('Database error'));

      await expect(service.update(packageId, updatePackageDto)).rejects.toThrow(
        new BadRequestException('Failed to update package'),
      );
    });
  });

  describe('remove', () => {
    const packageId = 'package-123';

    it('should remove a package successfully', async () => {
      prismaService.package.findUnique.mockResolvedValue(mockPackage);
      prismaService.package.delete.mockResolvedValue(mockPackage);

      const result = await service.remove(packageId);

      expect(prismaService.package.findUnique).toHaveBeenCalledWith({
        where: { id: packageId },
        select: mockPackageSelect,
      });

      expect(prismaService.package.delete).toHaveBeenCalledWith({
        where: { id: packageId },
        select: mockPackageSelect,
      });

      expect(result).toEqual(mockPackage);
    });

    it('should throw BadRequestException when package not found', async () => {
      prismaService.package.findUnique.mockResolvedValue(null);

      await expect(service.remove(packageId)).rejects.toThrow(
        new BadRequestException('Failed to remove package'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.package.findUnique.mockResolvedValue(mockPackage);
      prismaService.package.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.remove(packageId)).rejects.toThrow(
        new BadRequestException('Failed to remove package'),
      );
    });
  });
});
