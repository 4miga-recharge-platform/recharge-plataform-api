import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProductService } from '../product.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

// Mock validation utility
jest.mock('../../utils/validation.util', () => ({
  validateRequiredFields: jest.fn(),
}));

describe('ProductService', () => {
  let service: ProductService;
  let prismaService: any;

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
    basePrice: 10.00,
    productId: 'product-123',
    storeId: 'store-123',
    paymentMethods: [
      {
        id: 'payment-123',
        name: 'Credit Card',
        price: 10.00,
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
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      package: {
        findMany: jest.fn(),
      },
    };

    const mockWebhookService = {
      notifyProductUpdate: jest.fn(),
      notifyPackageUpdate: jest.fn(),
      notifyStoreUpdate: jest.fn(),
    };

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
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prismaService = module.get(PrismaService);

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

      prismaService.product.findMany.mockResolvedValue(products);
      prismaService.package.findMany.mockResolvedValue(packages);

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
      });

      expect(result).toEqual([{ ...mockProduct, packages }]);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.product.findMany.mockRejectedValue(new Error('Database error'));

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
      prismaService.product.findMany.mockRejectedValue(new Error('Database error'));

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

      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.package.findMany.mockResolvedValue(packages);

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
      });

      expect(result).toEqual({ ...mockProduct, packages });
    });

    it('should throw BadRequestException when product not found', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne(productId, storeId)).rejects.toThrow(
        new BadRequestException('Failed to fetch product'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.product.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(productId, storeId)).rejects.toThrow(
        new BadRequestException('Failed to fetch product'),
      );
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

      prismaService.product.create.mockRejectedValue(new Error('Database error'));

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
      prismaService.product.update.mockResolvedValue({ ...mockProduct, ...updateProductDto });

      const result = await service.update(productId, updateProductDto);

      expect(validateRequiredFields).toHaveBeenCalledWith(updateProductDto, ['name', 'description']);

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
      prismaService.product.update.mockRejectedValue(new Error('Database error'));

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
      prismaService.product.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.remove(productId)).rejects.toThrow(
        new BadRequestException('Failed to remove product'),
      );
    });
  });
});
